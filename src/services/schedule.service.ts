import { EntityManager } from '@mikro-orm/core';
import moment from 'moment';

import { Schedule } from '../entities/Schedule';
import { ScheduleOptions } from '../entities/ScheduleOptions';
import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { ScheduleState, ScheduleType, UserRoleEnum } from '../types/enums';
import { UpdateScheduleProgrammedProps } from '../types/resolvers';
import {
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  VAL_ERRORS,
  NOT_FND_ERRORS,
  FORBIDDEN_ERRORS,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';
import {
  createDateWithTime,
  createInitialSchedules,
  createScheduleProgrammed,
} from '../utils/schedules.util';

import { BaseService } from './base.service';

export type createScheduleDataType = {
  currentUser: CurrentUser;
  title: string;
  description: string;
  startHour: string;
  endHour: string;
  days: number[];
  maxUsers: number;
  age: number | null | undefined;
  admin: string;
  type: ScheduleType;
  repeat: boolean;
  date?: string;
};

export type updateScheduleDataType = {
  currentUser: CurrentUser;
  id: string;
  title?: string;
  description?: string;
  maxUsers?: number;
  age?: number | null;
  admin?: string;
  type?: ScheduleType;
  state?: ScheduleState;
  date?: string;
  startHour?: string;
  endHour?: string;
};

export class ScheduleService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Obtener schedules por ID, IDs múltiples o todos
   */
  public async getSchedules(
    currentUser: CurrentUser,
    scheduleId?: string,
    schedulesIds?: string[]
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const scheduleRepo = this.em.getRepository(Schedule);

    // Por ID único
    if (scheduleId) {
      const schedule = await scheduleRepo.findOne(
        { id: scheduleId },
        { populate: ['admin', 'users'] }
      );

      if (!schedule) {
        throw new NotFoundError('Schedule');
      }

      return createServiceResponse(200, 'Schedule found', true, { schedule });
    }

    // Por IDs múltiples
    if (schedulesIds) {
      if (schedulesIds.length === 0) {
        return createServiceResponse(200, 'Schedules not found', true, {
          schedules: [],
        });
      }

      const schedules = await scheduleRepo.find(
        { id: { $in: schedulesIds } },
        { populate: ['admin', 'users'] }
      );

      if (!schedules || schedules.length === 0) {
        throw new NotFoundError('Schedules');
      }

      return createServiceResponse(200, 'Schedules found', true, { schedules });
    }

    // Todos los schedules
    const schedules = await scheduleRepo.findAll({
      populate: ['admin', 'users'],
    });

    return createServiceResponse(200, 'Schedules found', true, { schedules });
  }

  public async getUserSchedules(
    currentUser: CurrentUser,
    userId?: string,
    past: boolean = false
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const targetUserId = userId || currentUser.id;

    // Solo ADMIN puede ver schedules de otros usuarios, o COACH si tiene permisos
    if (
      targetUserId !== currentUser.id &&
      currentUser.contextRole === UserRoleEnum.STANDARD
    ) {
      throw new ForbiddenError(
        'You are not authorized to view these schedules'
      );
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const filter: any = {
      $or: [{ users: targetUserId }, { waitListUsers: targetUserId }],
    };

    if (!past) {
      filter.startDate = { $gte: new Date() };
    }

    const schedules = await scheduleRepo.find(filter, {
      populate: ['admin', 'users', 'waitListUsers'],
      orderBy: { startDate: 'ASC' },
    });

    return createServiceResponse(200, 'User schedules found', true, {
      schedules,
    });
  }

  /**
   * Obtener schedules desde hoy en adelante
   */
  public async getSchedulesFromToday(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const schedules = await scheduleRepo.find(
      {
        startDate: { $gte: startOfDay },
      },
      { populate: ['users'] }
    );

    return createServiceResponse(200, 'Schedules found', true, { schedules });
  }

  /**
   * Obtener resumen de schedules desde hoy
   */
  public async getSchedulesResume(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const scheduleRepo = this.em.getRepository(Schedule);
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const schedules = await scheduleRepo.find(
        {
          startDate: { $gte: startOfDay },
        },
        { populate: ['users'], orderBy: { startDate: 'ASC' } }
      );

      const schedulesResume = schedules.map(schedule => ({
        id: schedule.id,
        startDate: schedule.startDate,
        maxUsers: schedule.maxUsers,
        state: schedule.state,
        ocupancy: schedule.users.length,
      }));

      return createServiceResponse(200, 'Schedules found', true, {
        schedulesResume,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching schedules resume ${error.message}`
      );
    }
  }

  /**
   * Obtener schedules de admin (solo COACH/ADMIN)
   */
  public async getAdminSchedules(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      { populate: ['adminSchedules'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return createServiceResponse(
      200,
      'Admin schedules fetched successfully',
      true,
      {
        schedules: user.adminSchedules.getItems(),
      }
    );
  }

  /**
   * Obtener resumen de schedules de hoy
   */
  public async getTodaySchedulesResume(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const scheduleRepo = this.em.getRepository(Schedule);
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const todaySchedules = await scheduleRepo.find(
        {
          startDate: { $gte: startOfDay, $lte: endOfDay },
        },
        { populate: ['users'] }
      );

      const schedulesResume = todaySchedules.map(schedule => ({
        id: schedule.id,
        startDate: schedule.startDate,
        maxUsers: schedule.maxUsers,
        state: schedule.state,
        ocupancy: schedule.users.length,
      }));

      return createServiceResponse(200, 'Schedules found', true, {
        schedulesResume,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching today schedules resume ${error.message}`
      );
    }
  }

  /**
   * Obtener schedules en rango de fechas
   */
  public async getSchedulesRange(
    currentUser: CurrentUser,
    startDate: Date | string,
    endDate: Date | string,
    mySchedules?: boolean
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const scheduleRepo = this.em.getRepository(Schedule);
      const startOfDay = moment(startDate).format('YYYY/MM/DD HH:mm:ss');
      const endOfDay = moment(endDate).format('YYYY/MM/DD HH:mm:ss');

      const schedules = await scheduleRepo.find(
        {
          startDate: { $gte: startOfDay, $lte: endOfDay },
        },
        { populate: ['users', 'admin', 'waitListUsers'] }
      );

      const sortSchedules = [...schedules].sort((a, b) => {
        return moment(a.startDate).unix() - moment(b.startDate).unix();
      });

      if (mySchedules) {
        const myUser = this.em.getReference(User, currentUser.id);
        const mySchedulesFiltered = sortSchedules.filter(
          schedule => schedule.admin.id === myUser.id
        );

        return createServiceResponse(200, 'Schedules found', true, {
          schedules: mySchedulesFiltered,
        });
      }

      return createServiceResponse(200, 'Schedules found', true, {
        schedules: sortSchedules,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching schedules range ${error.message}`
      );
    }
  }

  /**
   * Obtener resumen de schedules en rango de fechas
   */
  public async getSchedulesResumeRange(
    currentUser: CurrentUser,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const scheduleRepo = this.em.getRepository(Schedule);
      const scheduleOptionsRepo = this.em.getRepository(ScheduleOptions);

      const scheduleOptions = await scheduleOptionsRepo.findOne({
        id: { $ne: null },
      });

      const startOfDay = new Date(startDate);
      const endOfDay = new Date(endDate);

      const schedules = await scheduleRepo.find(
        {
          startDate: { $gte: startOfDay, $lte: endOfDay },
        },
        { populate: ['users', 'admin'] }
      );

      const sortSchedules = [...schedules].sort((a, b) => {
        return moment(a.startDate).unix() - moment(b.startDate).unix();
      });

      const schedulesResume = sortSchedules.map(schedule => ({
        id: schedule.id,
        startDate: schedule.startDate,
        maxUsers: schedule.maxUsers,
        state: schedule.state,
        ocupancy: schedule.users.length,
      }));

      return createServiceResponse(200, 'Schedules found', true, {
        schedulesResume,
        scheduleOptions,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching schedules resume range ${error.message}`
      );
    }
  }

  /**
   * Obtener opciones de schedule
   */
  public async getScheduleOptions(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const scheduleOptionRepo = this.em.getRepository(ScheduleOptions);
      const scheduleOptions = await scheduleOptionRepo.findOne({
        company: currentUser.activeCompanyId,
      });

      return createServiceResponse(200, 'Schedule options found', true, {
        scheduleOptions,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching schedule options ${error.message}`
      );
    }
  }

  /**
   * Obtener estadísticas de schedules (solo ADMIN)
   */
  public async getSchedulesStats(
    currentUser: CurrentUser,
    month: number
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.ADMIN) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    try {
      const ScheduleRepo = this.em.getRepository(Schedule);

      // Mes actual
      const startOfMonth = moment().month(month).startOf('month').toDate();
      const endOfMonth = moment().month(month).endOf('month').toDate();

      const schedulesFirstMonth = await ScheduleRepo.find(
        {
          startDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
        { fields: ['maxUsers', 'startDate', 'users'] }
      );

      const groupedSchedulesFirstMonth = schedulesFirstMonth.reduce(
        (acc, schedule) => {
          const dayAndTime = moment(schedule.startDate).format('ddd HH:mm');
          if (!acc[dayAndTime]) {
            acc[dayAndTime] = [];
          }
          acc[dayAndTime].push(schedule);
          return acc;
        },
        {} as Record<string, typeof schedulesFirstMonth>
      );

      const schedulesSummaryFirstMonth = Object.entries(
        groupedSchedulesFirstMonth
      ).map(([dayAndTime, group]: [string, any]) => {
        const totalRatio = group.reduce(
          (sum: number, schedule: any) =>
            sum + schedule.users.length / schedule.maxUsers,
          0
        );
        const averageRatio = (totalRatio / group.length) * 100;
        return { dayAndTime, ratio: averageRatio };
      });

      // Mes pasado
      const startPastMonth = moment()
        .month(month - 1)
        .startOf('month')
        .toDate();
      const endPastMonth = moment()
        .month(month - 1)
        .endOf('month')
        .toDate();

      const schedulesPastMonth = await ScheduleRepo.find(
        {
          startDate: { $gte: startPastMonth, $lte: endPastMonth },
        },
        { fields: ['maxUsers', 'startDate', 'users'] }
      );

      const groupedSchedulesPastMonth = schedulesPastMonth.reduce(
        (acc, schedule) => {
          const dayAndTime = moment(schedule.startDate).format('ddd HH:mm');
          if (!acc[dayAndTime]) {
            acc[dayAndTime] = [];
          }
          acc[dayAndTime].push(schedule);
          return acc;
        },
        {} as Record<string, typeof schedulesPastMonth>
      );

      const schedulesSummaryPastMonth = Object.entries(
        groupedSchedulesPastMonth
      ).map(([dayAndTime, group]: [string, any]) => {
        const totalRatio = group.reduce(
          (sum: number, schedule: any) =>
            sum + schedule.users.length / schedule.maxUsers,
          0
        );
        const averageRatio = (totalRatio / group.length) * 100;
        return { dayAndTime, ratio: averageRatio };
      });

      return createServiceResponse(200, 'Schedules found', true, {
        stats: [schedulesSummaryFirstMonth, schedulesSummaryPastMonth],
      });
    } catch (error: any) {
      if (
        error instanceof ForbiddenError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      throw new InternalServerError('Error fetching schedules stats');
    }
  }

  /**
   * Obtener schedules mensuales por hora específica (solo ADMIN)
   */
  public async getMonthlySchedules(
    currentUser: CurrentUser,
    month: number,
    startHour: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.ADMIN) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const startOfMonth = moment().month(month).startOf('month').toDate();
    const endOfMonth = moment().month(month).endOf('month').toDate();

    const monthlySchedules = await this.em.find(
      Schedule,
      {
        startDate: { $gte: startOfMonth, $lte: endOfMonth },
      },
      { populate: ['users'] }
    );

    const matchHourSchedules = monthlySchedules.filter(schedule => {
      return (
        moment(Number(schedule.startDate)).format('ddd HH:mm') === startHour
      );
    });

    if (matchHourSchedules.length > 0) {
      return createServiceResponse(200, 'Schedules found', true, {
        schedules: matchHourSchedules,
      });
    } else {
      throw new NotFoundError('Schedules');
    }
  }

  public async createSchedule(
    scheduleData: createScheduleDataType
  ): Promise<ServiceResponse> {
    const {
      currentUser,
      age,
      repeat,
      days,
      title,
      description,
      startHour,
      endHour,
      maxUsers,
      type,
      admin,
      date,
    } = scheduleData;
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    return await this.em.transactional(async tem => {
      try {
        const finalAge = age && age > 0 ? age : null;
        const adminRef = tem.getReference(User, admin);

        if (repeat) {
          await createScheduleProgrammed(
            {
              daysOfWeek: days,
              title,
              description,
              startHour,
              endHour,
              maxUsers,
              admin: adminRef,
              age: finalAge,
              type,
            },
            { em: tem, currentUser }
          );

          return createServiceResponse(200, 'Schedule created', true);
        } else {
          if (!date) {
            throw new ValidationError(
              'Date is required for non-repeating schedules'
            );
          }

          const schedules: Schedule[] = [];
          const [startH, startM] = startHour.split(':').map(Number);
          const [endH, endM] = endHour.split(':').map(Number);

          const startDate = moment(date).set({
            hour: startH,
            minute: startM,
            second: 0,
            millisecond: 0,
          });

          const endDate = startDate.clone().set({
            hour: endH,
            minute: endM,
          });

          const newSchedule = tem.create(Schedule, {
            title,
            description,
            age: finalAge,
            type,
            startDate: startDate.toDate(),
            endDate: endDate.toDate(),
            maxUsers,
            state: ScheduleState.AVAILABLE,
            admin: adminRef,
            company: currentUser.activeCompanyId!,
          });

          tem.persist(newSchedule);
          schedules.push(newSchedule);

          await tem.flush();

          return createServiceResponse(
            200,
            'Schedule created successfully',
            true,
            {
              schedules,
            }
          );
        }
      } catch (error: any) {
        if (
          error instanceof ForbiddenError ||
          error instanceof UnauthorizedError
        ) {
          throw error;
        }
        throw new InternalServerError('Error creating schedule');
      }
    });
  }

  /**
   * Obtener schedules programados
   */
  public async getSchedulesProgrammed(
    currentUser: CurrentUser,
    id?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const scheduleProgrammedRepo = this.em.getRepository(ScheduleProgrammed);

    if (id) {
      const scheduleProgrammed = await scheduleProgrammedRepo.findOne(
        { id },
        { populate: ['admin'] }
      );
      if (!scheduleProgrammed) {
        throw new NotFoundError('ScheduleProgrammed');
      }
      return createServiceResponse(200, 'Schedule programmed found', true, {
        scheduleProgrammed,
      });
    }

    const schedulesProgrammed = await scheduleProgrammedRepo.findAll({
      populate: ['admin'],
    });
    return createServiceResponse(200, 'Schedules programmed found', true, {
      schedulesProgrammed,
    });
  }

  /**
   * Eliminar schedules programados
   */
  public async deleteSchedulesProgrammed(
    currentUser: CurrentUser,
    ids: string[]
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    return await this.em.transactional(async tem => {
      const scheduleProgrammedRepo = tem.getRepository(ScheduleProgrammed);
      const now = new Date();

      for (const id of ids) {
        const scheduleProgrammed = await scheduleProgrammedRepo.findOne(
          { id },
          { populate: ['schedules'] }
        );

        if (!scheduleProgrammed) {
          continue; // O podrías lanzar error, pero en lote suele ser mejor continuar si no existe
        }

        // Separar horarios pasados y futuros
        const schedules = scheduleProgrammed.schedules.getItems();
        const futureSchedules = schedules.filter(s => s.startDate > now);
        const pastSchedules = schedules.filter(s => s.startDate <= now);

        // Eliminar horarios futuros
        for (const futureSchedule of futureSchedules) {
          tem.remove(futureSchedule);
        }

        // Desvincular horarios pasados
        for (const pastSchedule of pastSchedules) {
          pastSchedule.scheduleProgrammed = undefined;
        }

        // Eliminar el schedule programado
        tem.remove(scheduleProgrammed);
      }

      await tem.flush();

      return createServiceResponse(
        200,
        'Schedules programmed deleted successfully',
        true
      );
    });
  }

  /**
   * Actualizar schedule programado
   */
  public async updateScheduleProgrammed(
    data: UpdateScheduleProgrammedProps['scheduleProgrammed'] & {
      currentUser: CurrentUser;
    }
  ): Promise<ServiceResponse> {
    const { currentUser, id, ...updateData } = data;

    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    return await this.em.transactional(async tem => {
      const scheduleProgrammedRepo = tem.getRepository(ScheduleProgrammed);
      const scheduleProgrammed = await scheduleProgrammedRepo.findOne(
        { id },
        { populate: ['schedules'] }
      );

      if (!scheduleProgrammed) {
        throw new NotFoundError('ScheduleProgrammed');
      }

      const daysChanged =
        updateData.daysOfWeek !== undefined &&
        JSON.stringify(updateData.daysOfWeek) !==
          JSON.stringify(scheduleProgrammed.daysOfWeek);

      // Actualizar metadata
      if (updateData.daysOfWeek !== undefined)
        scheduleProgrammed.daysOfWeek = updateData.daysOfWeek;
      if (updateData.startHour !== undefined)
        scheduleProgrammed.startHour = updateData.startHour;
      if (updateData.endHour !== undefined)
        scheduleProgrammed.endHour = updateData.endHour;
      if (updateData.maxUsers !== undefined)
        scheduleProgrammed.maxUsers = updateData.maxUsers;
      if (updateData.title !== undefined)
        scheduleProgrammed.title = updateData.title;
      if (updateData.description !== undefined)
        scheduleProgrammed.description = updateData.description;
      if (updateData.type !== undefined)
        scheduleProgrammed.type = updateData.type;
      if (updateData.age !== undefined) scheduleProgrammed.age = updateData.age;
      if (updateData.admin !== undefined)
        scheduleProgrammed.admin = tem.getReference(User, updateData.admin);

      const now = new Date();
      const futureSchedules = scheduleProgrammed.schedules
        .getItems()
        .filter(s => s.startDate > now);

      if (daysChanged) {
        // Si los días han cambiado, eliminar futuros y recrear
        for (const futureSchedule of futureSchedules) {
          tem.remove(futureSchedule);
        }
        await createInitialSchedules(scheduleProgrammed, tem);
      } else {
        // Si no han cambiado los días, actualizar los existentes futuros
        for (const futureSchedule of futureSchedules) {
          if (updateData.title !== undefined)
            futureSchedule.title = updateData.title;
          if (updateData.description !== undefined)
            futureSchedule.description = updateData.description;
          if (updateData.maxUsers !== undefined)
            futureSchedule.maxUsers = updateData.maxUsers;
          if (updateData.type !== undefined)
            futureSchedule.type = updateData.type;
          if (updateData.age !== undefined) futureSchedule.age = updateData.age;
          if (updateData.admin !== undefined)
            futureSchedule.admin = tem.getReference(User, updateData.admin);

          if (
            updateData.startHour !== undefined ||
            updateData.endHour !== undefined
          ) {
            const baseDate = moment(futureSchedule.startDate);
            const [sH, sM] = (
              updateData.startHour || scheduleProgrammed.startHour
            )
              .split(':')
              .map(Number);
            const [eH, eM] = (updateData.endHour || scheduleProgrammed.endHour)
              .split(':')
              .map(Number);

            futureSchedule.startDate = baseDate
              .clone()
              .set({ hour: sH, minute: sM, second: 0, millisecond: 0 })
              .toDate();
            futureSchedule.endDate = baseDate
              .clone()
              .set({ hour: eH, minute: eM, second: 0, millisecond: 0 })
              .toDate();
          }
        }
      }

      await tem.flush();

      return createServiceResponse(
        200,
        'Schedule programmed updated successfully',
        true,
        {
          scheduleProgrammed,
        }
      );
    });
  }

  public async updateSchedule(
    scheduleData: updateScheduleDataType
  ): Promise<ServiceResponse> {
    const {
      currentUser,
      id,
      title,
      description,
      maxUsers,
      age,
      admin,
      type,
      state,
      date,
      startHour,
      endHour,
    } = scheduleData;

    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    return await this.em.transactional(async tem => {
      try {
        const scheduleRepo = tem.getRepository(Schedule);
        const schedule = await scheduleRepo.findOne(
          { id: id },
          { populate: ['admin'] }
        );

        if (!schedule) {
          throw new NotFoundError('Schedule');
        }

        // Solo el admin o el propio coach pueden editar
        if (
          currentUser.contextRole !== UserRoleEnum.ADMIN &&
          schedule.admin.id !== currentUser.id
        ) {
          throw new ForbiddenError(FORBIDDEN_ERRORS.NOT_AUTHORIZED);
        }

        if (title !== undefined) schedule.title = title;
        if (description !== undefined) schedule.description = description;

        if (date || startHour || endHour) {
          const baseDate = date ? moment(date) : moment(schedule.startDate);

          if (date || startHour) {
            const timeStr =
              startHour || moment(schedule.startDate).format('HH:mm');
            const [h, m] = timeStr.split(':').map(Number);
            schedule.startDate = baseDate
              .clone()
              .set({ hour: h, minute: m, second: 0, millisecond: 0 })
              .toDate();
          }

          if (date || endHour) {
            const timeStr = endHour || moment(schedule.endDate).format('HH:mm');
            const [h, m] = timeStr.split(':').map(Number);
            schedule.endDate = baseDate
              .clone()
              .set({ hour: h, minute: m, second: 0, millisecond: 0 })
              .toDate();
          }
        }

        if (maxUsers !== undefined) schedule.maxUsers = maxUsers;
        if (type !== undefined) schedule.type = type;
        if (state !== undefined) schedule.state = state;

        if (age !== undefined) {
          schedule.age = age && age > 0 ? age : null;
        }

        if (admin !== undefined) {
          schedule.admin = tem.getReference(User, admin);
        }

        await tem.flush();

        return createServiceResponse(
          200,
          'Schedule updated successfully',
          true,
          {
            schedule,
          }
        );
      } catch (error: any) {
        if (
          error instanceof ForbiddenError ||
          error instanceof UnauthorizedError ||
          error instanceof NotFoundError
        ) {
          throw error;
        }
        throw new InternalServerError('Error updating schedule');
      }
    });
  }

  /**
   * Agregar usuario a schedule
   */
  public async addUserToSchedule(
    currentUser: CurrentUser,
    scheduleId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const user = await this.em.findOne(
      User,
      { id: currentUser.id },
      { populate: ['schedules', 'waitListSchedules'] }
    );

    if (!user) {
      throw new NotFoundError(NOT_FND_ERRORS.USER);
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ['users', 'admin', 'waitListUsers'] }
    );

    if (!schedule) {
      throw new NotFoundError(NOT_FND_ERRORS.SCHEDULE);
    }

    const scheduleOptions = await this.em.findOne(ScheduleOptions, {
      id: { $ne: null },
    });

    // Validaciones
    const isStateDisabled = schedule.state !== ScheduleState.AVAILABLE;
    const isHourDisabled = moment().isAfter(Number(schedule.startDate));
    const isFull = schedule.users.length >= schedule.maxUsers;
    const isBooked = user.schedules.getItems().some(s => s.id === schedule.id);
    const isWaitListed = user.waitListSchedules
      .getItems()
      .some(s => s.id === schedule.id);
    const isAdmin = currentUser.contextRole === UserRoleEnum.ADMIN;
    const isUserCoachOfEvent =
      currentUser.contextRole === UserRoleEnum.COACH &&
      schedule.admin.id === currentUser.id;
    const isMaxUserBookingsReached =
      user.schedules.length + user.waitListSchedules.length >=
      (scheduleOptions?.maxActiveReservations || Infinity);
    const isMaxUserBookingsTodayReached =
      !scheduleOptions?.sameDayBookingAllowed &&
      (user.schedules
        .getItems()
        .some(s =>
          moment(Number(s.startDate)).isSame(
            moment(Number(schedule.startDate)),
            'day'
          )
        ) ||
        user.waitListSchedules
          .getItems()
          .some(s =>
            moment(Number(s.startDate)).isSame(
              moment(Number(schedule.startDate)),
              'day'
            )
          ));

    const maxAdvanceDate = moment()
      .add(scheduleOptions?.maxAdvanceBookingDays ?? 0, 'days')
      .startOf('day');

    const isAdvanceBookingDisabled =
      moment(Number(schedule.startDate)).isAfter(maxAdvanceDate) &&
      !scheduleOptions?.sameDayBookingAllowed;

    const {
      SCHEDULE_NOT_AVAILABLE,
      SCHEDULE_ALREADY_PASSED,
      MAX_ACTIVE_RESERVATIONS_REACHED,
      SAME_DAY_BOOKING_NOT_ALLOWED,
      ADVANCE_BOOKING_OUTSIDE_WINDOW,
      USER_ALREADY_IN_SCHEDULE,
    } = VAL_ERRORS;

    if (!(isAdmin || isUserCoachOfEvent)) {
      if (isStateDisabled) {
        throw new ValidationError(SCHEDULE_NOT_AVAILABLE);
      }
      if (isHourDisabled) {
        throw new ValidationError(SCHEDULE_ALREADY_PASSED);
      }

      if (!isBooked && !isWaitListed) {
        if (isMaxUserBookingsReached) {
          throw new ValidationError(MAX_ACTIVE_RESERVATIONS_REACHED);
        }
        if (isMaxUserBookingsTodayReached) {
          throw new ValidationError(SAME_DAY_BOOKING_NOT_ALLOWED);
        }
        if (isAdvanceBookingDisabled) {
          throw new ValidationError(ADVANCE_BOOKING_OUTSIDE_WINDOW);
        }
      }
    }

    if (
      schedule.users.contains(user) ||
      schedule.waitListUsers.contains(user)
    ) {
      throw new ValidationError(USER_ALREADY_IN_SCHEDULE);
    }

    let message = 'User added to schedule';
    if (isFull) {
      schedule.waitListUsers.add(user);
      message = 'User added to waitlist';
    } else {
      schedule.users.add(user);
    }

    this.em.persist(schedule);
    await this.em.flush();

    return createServiceResponse(200, message, true, {
      schedule,
    });
  }

  /**
   * Remover usuario de schedule
   */
  public async removeUserFromSchedule(
    currentUser: CurrentUser,
    scheduleId: string,
    userId?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      {
        populate: [
          'users',
          'admin',
          'waitListUsers',
          'waitListUsers.pushTokens',
        ],
      }
    );

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    let id = null;

    if (userId) {
      if (
        userId === currentUser.id ||
        (currentUser.contextRole === UserRoleEnum.COACH &&
          userId === schedule.admin.id) ||
        currentUser.contextRole === UserRoleEnum.ADMIN
      ) {
        id = userId;
      } else {
        throw new ForbiddenError(
          'You are not authorized to perform this action'
        );
      }
    } else {
      id = currentUser.id;
    }

    const user = await this.em.findOne(User, { id });

    if (!user) {
      throw new NotFoundError('User');
    }

    let message = 'User removed from schedule';

    if (schedule.users.contains(user)) {
      schedule.users.remove(user);

      // Si hay gente en la waitlist, meter al primero
      if (schedule.waitListUsers.length > 0) {
        const nextUser = schedule.waitListUsers.getItems()[0];
        schedule.waitListUsers.remove(nextUser);
        schedule.users.add(nextUser);
        await this.sendWaitlistPromotionNotification(schedule, nextUser);
      }
    } else if (schedule.waitListUsers.contains(user)) {
      schedule.waitListUsers.remove(user);
      message = 'User removed from waitlist';
    } else {
      throw new ForbiddenError('User not in schedule or waitlist');
    }

    this.em.persist(schedule);
    await this.em.flush();

    return createServiceResponse(200, message, true, {
      schedule,
    });
  }

  /**
   * Crear schedule de desarrollo (solo para desarrollo)
   */
  public async createScheduleDevelopment(
    currentUser: CurrentUser,
    title: string,
    startTime: string,
    endTime: string,
    maxUsers: number,
    state: ScheduleState = ScheduleState.AVAILABLE
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const newStartDate = createDateWithTime(startTime);
      const newEndDate = createDateWithTime(endTime);
      const admin = this.em.getReference(User, currentUser.id);

      const newSchedule = this.em.create(Schedule, {
        title,
        startDate: newStartDate,
        endDate: newEndDate,
        maxUsers,
        state,
        admin,
        company: currentUser.activeCompanyId!,
        type: ScheduleType.STANDARD,
      });

      this.em.persist(newSchedule);
      await this.em.flush();

      return createServiceResponse(200, 'Schedule created successfully', true);
    } catch (error: any) {
      throw new InternalServerError(`Error creating schedule ${error.message}`);
    }
  }

  /**
   * Cambiar estado de schedule (AVAILABLE <-> CANCELLED)
   */
  public async changeScheduleStatus(
    currentUser: CurrentUser,
    scheduleId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ['users', 'users.pushTokens', 'admin'] }
    );

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    if (
      schedule.admin.id !== currentUser.id &&
      currentUser.contextRole !== UserRoleEnum.ADMIN
    ) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const newState =
      schedule.state === ScheduleState.AVAILABLE
        ? ScheduleState.CANCELLED
        : ScheduleState.AVAILABLE;
    schedule.state = newState;

    this.em.persist(schedule);
    await this.em.flush();

    // Enviar notificaciones si fue cancelado
    if (newState === ScheduleState.CANCELLED) {
      await this.sendScheduleCancellationNotifications(schedule);
    }

    return createServiceResponse(
      200,
      'Schedule status changed successfully',
      true,
      {
        schedule,
      }
    );
  }

  /**
   * Remover schedule
   */
  public async removeSchedule(
    currentUser: CurrentUser,
    scheduleId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ['admin'] }
    );

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    if (
      schedule.admin.id !== currentUser.id &&
      currentUser.contextRole !== UserRoleEnum.ADMIN
    ) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    this.em.remove(schedule);
    await this.em.flush();

    return createServiceResponse(200, 'Schedule removed successfully', true);
  }

  /**
   * Actualizar opciones de schedule (solo ADMIN)
   */
  public async updateScheduleOptions(
    currentUser: CurrentUser,
    maxActiveReservations: number,
    maxAdvanceBookingDays: number,
    sameDayBookingAllowed: boolean,
    fullOpenHours: number
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.ADMIN) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    try {
      const scheduleOptionsRepo = this.em.getRepository(ScheduleOptions);
      let scheduleOptions = await scheduleOptionsRepo.findOne({
        company: currentUser.activeCompanyId,
      });

      scheduleOptions ??= this.em.create(
        ScheduleOptions,
        {} as ScheduleOptions
      );

      scheduleOptions.maxActiveReservations = maxActiveReservations;
      scheduleOptions.maxAdvanceBookingDays = maxAdvanceBookingDays;
      scheduleOptions.sameDayBookingAllowed = sameDayBookingAllowed;
      scheduleOptions.fullOpenHours = fullOpenHours;

      this.em.persist(scheduleOptions);
      await this.em.flush();

      return createServiceResponse(
        200,
        'Schedule options updated successfully',
        true,
        {
          scheduleOptions,
        }
      );
    } catch (error: any) {
      if (
        error instanceof ForbiddenError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      throw new InternalServerError('Error updating schedule options');
    }
  }

  public async cutOffSchedules() {
    try {
      const now = moment();
      const twentyFourHoursLater = now.clone().add(24, 'hours').toDate();

      const scheduleRepo = this.em.getRepository(Schedule);
      const schedules = await scheduleRepo.find(
        {
          state: ScheduleState.AVAILABLE,
          startDate: { $gte: now.toDate(), $lte: twentyFourHoursLater },
        },
        {
          populate: [
            'users',
            'company',
            'company.scheduleOptions',
            'users.pushTokens',
          ],
          filters: false,
        }
      );

      const cancelledSchedules: Schedule[] = [];

      for (const schedule of schedules) {
        console.log(
          `Evaluating schedule ${schedule.id} - ${schedule.title} at ${schedule.startDate}`
        );
      }

      for (const schedule of schedules) {
        const options = schedule.company?.scheduleOptions;
        if (!options) continue;

        const cutoffMinutes = options.bookingCutoffMinutes || 0;
        console.log(
          '🚀 ~ ScheduleService ~ cutOffSchedules ~ cutoffMinutes:',
          cutoffMinutes
        );
        const minBookings = options.minBookingsRequired || 0;
        console.log(
          '🚀 ~ ScheduleService ~ cutOffSchedules ~ minBookings:',
          minBookings
        );

        // Si no hay requisitos de reserva o el tiempo de corte es 0 (deshabilitado), saltamos
        if (minBookings <= 0 || cutoffMinutes <= 0) {
          console.log(
            `Skipping schedule ${schedule.id} - No cutoff or min bookings set`
          );
          continue;
        }

        const cutoffTime = moment(schedule.startDate).subtract(
          cutoffMinutes,
          'minutes'
        );

        if (
          now.isSameOrAfter(cutoffTime) &&
          schedule.users.length < minBookings
        ) {
          console.log(
            `Cutting off schedule ${schedule.id} - Only ${schedule.users.length} bookings`
          );
          schedule.state = ScheduleState.CANCELLED;
          cancelledSchedules.push(schedule);
        }
      }

      if (cancelledSchedules.length > 0) {
        await this.em.flush();

        console.log(
          `Cancelled ${cancelledSchedules.length} schedules due to cutoff criteria.`
        );

        // Enviar notificaciones
        for (const schedule of cancelledSchedules) {
          await this.sendScheduleCancellationNotifications(schedule);
        }
      }
    } catch (error) {
      console.error('Error in cutOffSchedules:', error);
    }
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Enviar notificaciones de promoción de waitlist
   */
  private async sendWaitlistPromotionNotification(
    schedule: Schedule,
    user: User
  ): Promise<void> {
    try {
      const title = '¡Tienes plaza!';
      const body = `Has sido movido de la lista de espera al horario "${schedule.title}".`;
      const data = {
        type: 'schedule_waitlist_promotion',
        scheduleId: schedule.id,
      };

      if (user.pushTokens && user.pushTokens.length > 0) {
        user.pushTokens.getItems().forEach(pushToken => {
          sendPushNotification(pushToken.token, title, body, data);
        });
      }
    } catch (error) {
      console.error('Error sending waitlist promotion notification:', error);
    }
  }

  /**
   * Enviar notificaciones de cancelación de schedule
   */
  private async sendScheduleCancellationNotifications(
    schedule: Schedule
  ): Promise<void> {
    try {
      const title = 'Horario cancelado';
      const body = `El horario "${schedule.title}" ha sido cancelado.`;
      const data = {
        type: 'schedule_cancelled',
        scheduleId: schedule.id,
      };

      schedule.users.getItems().forEach(user => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.getItems().forEach(pushToken => {
            sendPushNotification(pushToken.token, title, body, data);
          });
        }
      });
    } catch (error) {
      console.error(
        'Error sending schedule cancellation notifications:',
        error
      );
      // No lanzar error - las notificaciones son secundarias
    }
  }
}
