import { EntityManager } from '@mikro-orm/core';
import moment from 'moment';

import { Poll } from '../entities/Poll';
import { PollVote } from '../entities/PollVote';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';

import { BaseService } from './base.service';

export class PollService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Crear nueva encuesta (solo COACH/ADMIN)
   */
  public async createPoll(
    currentUser: CurrentUser,
    title: string,
    endDate: Date | string,
    options: string[]
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    // Verificar rol
    if (
      currentUser.contextRole !== UserRoleEnum.COACH &&
      currentUser.contextRole !== UserRoleEnum.ADMIN
    ) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    // Filtrar opciones vacías
    const filteredOptions = options.filter(option => option.trim() !== '');

    if (filteredOptions.length === 0) {
      throw new BadRequestError('At least one option is required');
    }

    // Verificar que endDate sea futuro
    if (moment(endDate).isBefore(new Date())) {
      throw new BadRequestError('End date must be in the future');
    }

    try {
      const newPoll = this.em.create(Poll, {
        endDate: moment(endDate).toDate(),
        title,
        options: filteredOptions,
        admin: this.em.getReference(User, currentUser.id),
        company: currentUser.activeCompanyId!,
      });

      this.em.persist(newPoll);
      await this.em.flush();

      // Enviar notificaciones push a todos los usuarios
      await this.sendPollNotifications(newPoll);

      return createServiceResponse(200, 'Poll created successfully', true, {
        poll: newPoll,
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestError ||
        error instanceof ForbiddenError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      throw new InternalServerError('Error creating poll');
    }
  }

  /**
   * Crear o cambiar voto en encuesta
   */
  public async createOrChangePollVote(
    currentUser: CurrentUser,
    pollId: string,
    option: number
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const pollRepo = this.em.getRepository(Poll);
    const poll = await pollRepo.findOne({ id: pollId });

    if (!poll) {
      throw new NotFoundError('Poll');
    }

    // Verificar que la encuesta no haya terminado
    if (poll.endDate < new Date()) {
      throw new ForbiddenError('Poll has ended');
    }

    // Verificar que la opción sea válida
    if (option < 0 || option >= poll.options.length) {
      throw new BadRequestError('Invalid option');
    }

    const newPollVote = this.em.create(PollVote, {
      poll,
      user: this.em.getReference(User, currentUser.id),
      optionSelected: option,
    });

    this.em.persist(newPollVote);
    await this.em.flush();

    return createServiceResponse(200, 'Vote created successfully', true, {
      vote: newPollVote,
    });
  }

  /**
   * Eliminar voto de encuesta
   */
  public async deletePollVote(
    currentUser: CurrentUser,
    pollId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const pollVote = await this.em.findOne(PollVote, {
      user: currentUser.id,
      poll: pollId,
    });

    if (!pollVote) {
      throw new NotFoundError('Poll vote');
    }

    this.em.remove(pollVote);
    await this.em.flush();

    return createServiceResponse(200, 'Poll vote deleted successfully', true);
  }

  /**
   * Eliminar múltiples encuestas
   */
  public async removePolls(
    currentUser: CurrentUser,
    ids: string[]
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (!ids || ids.length === 0) {
      throw new BadRequestError('At least one poll ID is required');
    }

    // Buscar las encuestas que existen con los ID proporcionados
    const polls = await this.em.find(Poll, {
      id: { $in: ids },
    });

    if (polls.length === 0) {
      throw new NotFoundError('No polls found with the provided IDs');
    }

    // Verificar si se encontraron todas las encuestas
    if (polls.length !== ids.length) {
      const foundIds = new Set(polls.map((poll: Poll) => poll.id));
      const notFoundIds = ids.filter(id => !foundIds.has(id));
      throw new NotFoundError(
        `Some polls not found: ${notFoundIds.join(', ')}`
      );
    }

    // Eliminar votos asociados
    await this.em.nativeDelete(PollVote, {
      poll: { $in: ids },
    });

    // Eliminar encuestas
    this.em.remove(polls);
    await this.em.flush();

    return createServiceResponse(
      200,
      `${polls.length} poll(s) and associated votes deleted successfully`,
      true
    );
  }

  /**
   * Obtener encuestas del admin
   */
  public async getAdminPolls(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    // Verificar que no sea usuario STANDARD
    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      { populate: ['adminPolls'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return createServiceResponse(
      200,
      'Admin polls fetched successfully',
      true,
      {
        polls: user.adminPolls.getItems(),
      }
    );
  }

  /**
   * Obtener encuestas (por ID, con filtro o todas activas)
   */
  public async getPolls(
    currentUser: CurrentUser,
    pollId?: string,
    filterSince?: Date | string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }
    const pollRepo = this.em.getRepository(Poll);

    // Si se especifica un pollId, buscar esa encuesta
    if (pollId) {
      const poll = await pollRepo.findOne({ id: pollId });

      if (!poll) {
        throw new NotFoundError('Poll');
      }

      return createServiceResponse(200, 'Poll found', true, { poll });
    }

    // Si hay filtro por fecha
    if (filterSince) {
      const polls = await pollRepo.find(
        {
          endDate: { $gte: filterSince },
        },
        { populate: ['admin'] }
      );

      return createServiceResponse(200, 'Polls found', true, { polls });
    }

    // Por defecto, obtener todas las encuestas activas
    const polls = await this.em.find(
      Poll,
      {
        endDate: { $gte: moment().toDate() },
      },
      {
        populate: ['admin', 'pollVotes.user'] as const,
        fields: [
          '*',
          'admin.id',
          'admin.nickname',
          'pollVotes.user.id',
          'pollVotes.user.pictureUrl',
          'pollVotes.optionSelected',
        ],
      }
    );

    return createServiceResponse(200, 'Polls found', true, { polls });
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Enviar notificaciones push sobre nueva encuesta
   */
  private async sendPollNotifications(poll: Poll): Promise<void> {
    try {
      const users = await this.em.find(User, {}, { populate: ['pushTokens'] });
      const notificationTitle = '¡Nueva encuesta disponible!';
      const notificationBody = poll.title;
      const notificationData = {
        type: 'new_poll',
        pollId: poll.id,
      };

      users.forEach((user: User) => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.getItems().forEach(pushToken => {
            sendPushNotification(
              pushToken.token,
              notificationTitle,
              notificationBody,
              notificationData
            );
          });
        }
      });
    } catch (error) {
      console.error('Error sending poll notifications:', error);
      // No lanzar error - las notificaciones son secundarias
    }
  }
}
