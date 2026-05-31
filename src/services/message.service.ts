import { EntityManager } from '@mikro-orm/core';
import moment from 'moment';

import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from '../constants/subscriptions';
import { Message } from '../entities/Message';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  createServiceResponse,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';

import { BaseService } from './base.service';
import { NotificationService } from './notification.service';

/**
 * Message Service - Handles messaging and conversations
 */
export class MessageService extends BaseService {
  private readonly notificationService: NotificationService;

  constructor(em: EntityManager) {
    super(em);
    this.notificationService = new NotificationService(em);
  }

  public async getConversation(
    otherUserId?: string,
    page: number = 0,
    limit: number = 50,
    isForumMessage: boolean = false,
    currentUser?: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const forumFields = isForumMessage
      ? ['isFixed', 'fixedEndDate', 'fixedAdmin']
      : [];
    const fields = [
      'id',
      'sender.id',
      'sender.profilePicture',
      'sender.nickname',
      'sender.role',
      'receiver.id',
      'receiver.profilePicture',
      'receiver.nickname',
      'receiver.role',
      'text',
      'created_at',
      'isForumMessage',
      ...forumFields,
    ];

    if (!otherUserId && !isForumMessage) {
      return await this.getAllConversations(currentUser, limit, fields);
    }

    return await this.getSpecificConversation(
      currentUser,
      otherUserId,
      page,
      limit,
      isForumMessage,
      fields
    );
  }

  public async createMessage(
    text: string,
    receiverId?: string,
    isFixed: boolean = false,
    isForumMessage: boolean = false,
    currentUser?: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (isFixed && currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    if (isFixed && !isForumMessage) {
      throw new ForbiddenError('You can only fix messages in the forum');
    }

    try {
      const receiver = receiverId
        ? await this.em.findOne(
            User,
            { id: receiverId },
            { populate: ['pushTokens'] }
          )
        : null;

      const newMessage = this.em.create(Message, {
        text,
        receiver,
        sender: this.em.getReference(User, currentUser.id),
        isFixed: isFixed,
        isForumMessage,
        company: currentUser.activeCompanyId!,
      });

      this.em.persist(newMessage);
      await this.em.flush();

      if (isForumMessage) {
        await this.handleForumMessageNotification(newMessage, currentUser);
      } else if (receiver) {
        await this.handleDirectMessageNotification(
          newMessage,
          receiver,
          currentUser
        );
      }

      myPubsub.publish(MESSAGE_EVENT, { newMessage });

      return createServiceResponse(200, 'Message created successfully', true, {
        sms: newMessage,
      });
    } catch (error: any) {
      console.error('Error creating message:', error);
      throw new Error(`Error creating message ${error.message}`);
    }
  }

  public async fixMessage(
    messageId: string,
    fixedEndDate: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const messageRepo = this.em.getRepository(Message);
    const message = await messageRepo.findOne({ id: messageId });

    if (!message) {
      throw new NotFoundError('Message');
    }

    if (
      currentUser.contextRole !== UserRoleEnum.ADMIN &&
      message.sender?.id !== currentUser.id
    ) {
      throw new ForbiddenError();
    }

    message.isFixed = true;
    message.fixedEndDate = moment(fixedEndDate).toDate();
    message.fixedAdmin = this.em.getReference(User, currentUser.id);

    this.em.persist(message);
    await this.em.flush();

    myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

    return createServiceResponse(200, 'Message fixed successfully', true, {
      conversation: {
        messages: [[message]],
      },
    });
  }

  public async unfixMessage(
    messageId: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const message = await this.em.findOne(Message, { id: messageId });

    if (!message) {
      throw new NotFoundError('Message');
    }

    if (
      message.fixedAdmin &&
      currentUser.contextRole === UserRoleEnum.COACH &&
      message.fixedAdmin.id !== currentUser.id
    ) {
      throw new ForbiddenError();
    }

    message.isFixed = false;
    message.fixedEndDate = null;

    this.em.persist(message);
    await this.em.flush();

    myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

    return createServiceResponse(200, 'Message unfixed successfully', true, {
      conversation: {
        messages: [[message]],
      },
    });
  }

  private async getAllConversations(
    currentUser: CurrentUser,
    limit: number,
    fields: string[] | any[]
  ): Promise<ServiceResponse> {
    const messageRepo = this.em.getRepository(Message);

    const rawUserIds: { otheruser: string }[] = await this.em
      .getConnection()
      .execute(
        `
                    SELECT DISTINCT CASE
                                        WHEN sender_id = ? THEN receiver_id
                                        ELSE sender_id
                                        END AS otherUser
                    FROM message
                    WHERE sender_id = ?
                       OR receiver_id = ?
                `,
        [currentUser.id, currentUser.id, currentUser.id]
      );

    // Filter out null / undefined values from otherUserIds, as the forum is queried separately
    const otherUserIds = rawUserIds
      .map(row => row.otheruser)
      .filter(id => id !== null && id !== undefined);

    const conversationPromises = otherUserIds.map(otherId => {
      return messageRepo.find(
        {
          $or: [
            { sender: currentUser.id, receiver: otherId },
            { sender: otherId, receiver: currentUser.id },
          ],
        },
        {
          orderBy: { created_at: 'DESC' },
          populate: ['sender', 'receiver'],
          limit,
          fields,
        }
      );
    });

    // Always query the forum messages as a separate conversation
    const forumPromise = messageRepo.find(
      { isForumMessage: true },
      {
        orderBy: { created_at: 'DESC' },
        populate: ['sender', 'receiver'],
        limit,
        fields,
      }
    );

    const conversationsGrouped = await Promise.all([
      forumPromise,
      ...conversationPromises,
    ]);

    // Filter out empty conversations (e.g. if the forum has no messages yet)
    const activeConversations = conversationsGrouped.filter(c => c.length > 0);

    activeConversations.sort((a, b) => {
      return (
        new Date(b[0].created_at).getTime() -
        new Date(a[0].created_at).getTime()
      );
    });

    return createServiceResponse(200, 'Conversations found', true, {
      conversations: activeConversations,
    });
  }

  private async getSpecificConversation(
    currentUser: CurrentUser,
    otherUserId: string | undefined,
    page: number,
    limit: number,
    isForumMessage: boolean,
    fields: string[] | any[]
  ): Promise<ServiceResponse> {
    const filter = isForumMessage
      ? {
          isForumMessage: true,
        }
      : {
          $or: [
            { sender: currentUser.id, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUser.id },
          ],
        };

    const messages = await this.em.find(Message, filter, {
      orderBy: { created_at: 'DESC' },
      limit,
      offset: page * limit,
      populate: ['sender', 'receiver'],
      fields,
    });

    const hasMore = messages.length === limit;

    const messagesByDay = messages.reduce(
      (groups, message) => {
        const day = moment(message.created_at).format('YYYY-MM-DD');
        if (!groups[day]) {
          groups[day] = [];
        }
        groups[day].push(message);
        return groups;
      },
      {} as Record<string, typeof messages>
    );

    const groupedMessages = Object.values(messagesByDay);

    return createServiceResponse(200, 'Conversation found', true, {
      conversation: {
        messages: groupedMessages,
        hasMore,
      },
    });
  }

  private async handleForumMessageNotification(
    message: Message,
    currentUser: CurrentUser
  ): Promise<void> {
    const title = 'Nuevo mensaje en el foro';
    const body = `${currentUser.nickname}: ${message.text}`;
    const data = {
      type: 'new_message',
      messageId: message.id,
      senderId: currentUser.id,
    };

    await this.notificationService.sendToAllActiveUsers(
      title,
      body,
      data,
      currentUser.id
    );
  }

  private async handleDirectMessageNotification(
    message: Message,
    receiver: User,
    currentUser: CurrentUser
  ): Promise<void> {
    const title = `Nuevo mensaje de ${currentUser.nickname}`;
    const body = message.text;
    const data = {
      type: 'new_message',
      messageId: message.id,
      senderId: currentUser.id,
    };

    await this.notificationService.sendToUser(receiver.id, title, body, data);
  }
}
