import { EntityManager } from "@mikro-orm/core";
import moment from "moment";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
import { UserRoleEnum } from "../types/enums";
import {
    createServiceResponse,
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
} from "../utils/errors.util";
import {
    FIXED_MESSAGE_EVENT,
    MESSAGE_EVENT,
    myPubsub,
} from "../constants/subscriptions";
import {BaseService} from "./base.service";
import {NotificationService} from "./notification.service";
import {CurrentUser, ServiceResponse} from "../types/common.type";

/**
 * Message Service - Handles messaging and conversations
 */
export class MessageService extends BaseService {
    private notificationService: NotificationService;

    constructor(em: EntityManager) {
        super(em)
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

        const forumFields = isForumMessage ? ["isFixed", "fixedEndDate", "fixedAdmin"] : [];
        const fields = [
            "id",
            "sender.id",
            "sender.profilePicture",
            "sender.nickname",
            "sender.role",
            "receiver.id",
            "receiver.profilePicture",
            "receiver.nickname",
            "receiver.role",
            "text",
            "created_at",
            "isForumMessage",
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
            throw new ForbiddenError("You can only fix messages in the forum");
        }

        try {
            const receiver = receiverId
                ? await this.em.findOne(User, { id: receiverId }, { populate: ["pushTokens"] })
                : null;

            const newMessage = this.em.create(Message, {
                text,
                receiver,
                sender: this.em.getReference(User, currentUser.id),
                isFixed: isFixed,
                isForumMessage,
                company: currentUser.activeCompanyId!,
            });

            await this.em.persistAndFlush(newMessage);

            await this.handleMessageNotifications(
                newMessage,
                receiver,
                isForumMessage,
                currentUser
            );

            myPubsub.publish(MESSAGE_EVENT, { newMessage });

            return createServiceResponse(200, "Message created successfully", true, {
                sms: newMessage,
            });
        } catch (error: any) {
            console.error("Error creating message:", error);
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
            throw new NotFoundError("Message");
        }

        if (
            currentUser.contextRole !== UserRoleEnum.BOSS &&
            message.sender.id !== currentUser.id
        ) {
            throw new ForbiddenError();
        }

        message.isFixed = true;
        message.fixedEndDate = moment(fixedEndDate).toDate();
        message.fixedAdmin = this.em.getReference(User, currentUser.id);

        await this.em.persistAndFlush(message);

        myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

        return createServiceResponse(200, "Message fixed successfully", true, {
            conversation: {
                messages: [[message]]
            }
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

        const message = await this.em.findOne(Message,{ id: messageId });

        if (!message) {
            throw new NotFoundError("Message");
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

        await this.em.persistAndFlush(message);

        myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

        return createServiceResponse(200, "Message unfixed successfully", true, {
            conversation: {
                messages: [[message]]
            }
        });
    }

    private async getAllConversations(
        currentUser: CurrentUser,
        limit: number,
        fields: string[]| any[]
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

        const otherUserIds = rawUserIds.map((row) => row.otheruser);

        const conversationPromises = otherUserIds.map((otherId) => {
            return messageRepo.find(
                {
                    $or: [
                        { sender: currentUser.id, receiver: otherId },
                        { sender: otherId, receiver: currentUser.id },
                        { isForumMessage: true },
                    ],
                },
                {
                    orderBy: { created_at: "DESC" },
                    populate: ["sender", "receiver"],
                    limit,
                    fields,
                }
            );
        });

        const conversationsGrouped = await Promise.all(conversationPromises);

        conversationsGrouped.sort((a, b) => {
            if (!a.length || !b.length) return b.length - a.length;
            return (
                new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
            );
        });

        return createServiceResponse(200, "Conversations found", true, {
            conversations: conversationsGrouped,
        });
    }

    private async getSpecificConversation(
        currentUser: CurrentUser,
        otherUserId: string | undefined,
        page: number,
        limit: number,
        isForumMessage: boolean,
        fields:  string[] | any[]
    ): Promise<ServiceResponse> {
        const filter = !isForumMessage
            ? {
                $or: [
                    { sender: currentUser.id, receiver: otherUserId },
                    { sender: otherUserId, receiver: currentUser.id },
                ],
            }
            : {
                isForumMessage: true,
            };

        const messages = await this.em.find(Message, filter, {
            orderBy: { created_at: "DESC" },
            limit,
            offset: page * limit,
            populate: ["sender", "receiver"],
            fields,
        });

        const hasMore = messages.length === limit;

        const messagesByDay = messages.reduce((groups, message) => {
            const day = moment(message.created_at).format("YYYY-MM-DD");
            if (!groups[day]) {
                groups[day] = [];
            }
            groups[day].push(message);
            return groups;
        }, {} as Record<string, typeof messages>);

        const groupedMessages = Object.values(messagesByDay);

        return createServiceResponse(200, "Conversation found", true, {
            conversation: {
                messages: groupedMessages,
                hasMore,
            },
        });
    }

    private async handleMessageNotifications(
        message: Message,
        receiver: User | null,
        isForumMessage: boolean,
        currentUser: CurrentUser
    ): Promise<void> {
        if (isForumMessage) {
            const title = "Nuevo mensaje en el foro";
            const body = `${currentUser.nickname}: ${message.text}`;
            const data = {
                type: "new_message",
                messageId: message.id,
                senderId: currentUser.id,
            };

            await this.notificationService.sendToAllActiveUsers(
                title,
                body,
                data,
                currentUser.id
            );
        } else if (receiver) {
            const title = `Nuevo mensaje de ${currentUser.nickname}`;
            const body = message.text;
            const data = {
                type: "new_message",
                messageId: message.id,
                senderId: currentUser.id,
            };

            await this.notificationService.sendToUser(receiver.id, title, body, data);
        }
    }
}