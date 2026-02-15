import { EntityManager } from '@mikro-orm/core';

import { TrainingTask } from '../entities/TraningITask';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  createServiceResponse,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors.util';

import { NotificationService } from './notification.service';

/**
 * Training Task Service - Handles training task operations
 */
export class TrainingTaskService {
  private notificationService: NotificationService;

  constructor(private readonly em: EntityManager) {
    this.notificationService = new NotificationService(em);
  }

  public async getTrainingTasks(
    userId: string,
    dateRange: [string, string],
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const trainingTasks = await this.em.find(
      TrainingTask,
      {
        $and: [
          {
            $or: [{ user: userId }, { user: null }],
          },
          {
            $or: [
              { date: { $gte: dateRange[0], $lte: dateRange[1] } },
              { repeat: true },
            ],
          },
        ],
      },
      { populate: ['user'] }
    );

    return createServiceResponse(200, 'Training tasks found', true, {
      trainingTasks,
    });
  }

  public async createTrainingTask(
    content: string,
    date: string,
    userId?: string,
    repeat: boolean = false,
    currentUser?: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const newTrainingTask = this.em.create(TrainingTask, {
      content,
      user: userId!,
      repeat,
      date,
      company: currentUser.activeCompanyId!,
    });

    try {
      this.em.persist(newTrainingTask);
      await this.em.flush();

      await this.sendTaskNotifications(newTrainingTask, userId, content);

      return createServiceResponse(
        200,
        'Training task created successfully',
        true,
        {
          trainingTask: newTrainingTask,
        }
      );
    } catch (error) {
      console.error('Error creating training task:', error);
      throw new Error('Error creating training task');
    }
  }

  public async removeTrainingTask(
    taskId: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const trainingTaskRepo = this.em.getRepository(TrainingTask);
    const trainingTask = await trainingTaskRepo.findOne({ id: taskId });

    if (!trainingTask) {
      throw new NotFoundError('Training task');
    }

    await this.em.removeAndFlush(trainingTask);

    return createServiceResponse(
      200,
      'Training task removed successfully',
      true
    );
  }

  private async sendTaskNotifications(
    task: TrainingTask,
    userId: string | undefined,
    content: string
  ): Promise<void> {
    const title = '¡Nueva tarea de entrenamiento!';
    const body = content;
    const data = {
      type: 'new_training_task',
      trainingTaskId: task.id,
    };

    if (userId) {
      await this.notificationService.sendToUser(userId, title, body, data);
    } else {
      await this.notificationService.sendToPremiumUsers(title, body, data);
    }
  }
}
