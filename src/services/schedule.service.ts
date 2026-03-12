import { EntityManager } from '@mikro-orm/core';
import moment from 'moment';

import { Schedule } from '../entities/Schedule';
import { ScheduleOptions } from '../entities/ScheduleOptions';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { ScheduleState, ScheduleType, UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';
import {
  createDateWithTime,
  createScheduleProgrammed,
} from '../utils/schedules.util';

import { BaseService } from './base.service';

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

    // Solo BOSS puede ver schedules de otros usuarios, o COACH si tiene permisos
    if (
      targetUserId !== currentUser.id &&
      currentUser.contextRole === UserRoleEnum.STANDARD
    ) {
      throw new ForbiddenError(
        'You are not authorized to view these schedules'
      );
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const filter: any = { users: targetUserId };

    if (!past) {
      filter.startDate = { $gte: new Date() };
    }

    const schedules = await scheduleRepo.find(filter, {
      populate: ['admin', 'users'],
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
      throw new InternalServerError('Error fetching schedules resume');
    }
  }

  /**
   * Obtener schedules de admin (solo COACH/BOSS)
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
      throw new InternalServerError('Error fetching today schedules resume');
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
        { populate: ['users', 'admin'] }
      );

      const sortSchedules = schedules.sort((a, b) => {
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
      throw new InternalServerError('Error fetching schedules range');
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

      const sortSchedules = schedules.sort((a, b) => {
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
      throw new InternalServerError('Error fetching schedules resume range');
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
      throw new InternalServerError('Error fetching schedule options');
    }
  }

  /**
   * Obtener estadísticas de schedules (solo BOSS)
   */
  public async getSchedulesStats(
    currentUser: CurrentUser,
    month: number
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
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
   * Obtener schedules mensuales por hora específica (solo BOSS)
   */
  public async getMonthlySchedules(
    currentUser: CurrentUser,
    month: number,
    startHour: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
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
    currentUser: CurrentUser,
    title: string,
    description: string,
    startHour: string,
    endHour: string,
    days: number[],
    repeat: boolean = false,
    maxUsers: number,
    age: number | null | undefined,
    admin: string,
    type: ScheduleType = ScheduleType.STANDARD
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    try {
      const finalAge = age && age > 0 ? age : null;
      const adminRef = this.em.getReference(User, admin);

      if (repeat) {
        const schedule = await createScheduleProgrammed(
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
          { em: this.em, currentUser }
        );

        return createServiceResponse(200, 'Schedule created', true, {
          schedule,
        });
      } else {
        const now = moment();
        const schedules: Schedule[] = [];

        for (const day of days) {
          // Moment days: 0=Sunday, 1=Monday...6=Saturday
          const momentDay = day;
          const [startH, startM] = startHour.split(':').map(Number);
          const [endH, endM] = endHour.split(':').map(Number);

          const startDate = moment().day(momentDay).set({
            hour: startH,
            minute: startM,
            second: 0,
            millisecond: 0,
          });

          if (startDate.isBefore(now)) {
            startDate.add(7, 'days');
          }

          const endDate = startDate.clone().set({
            hour: endH,
            minute: endM,
          });

          const newSchedule = this.em.create(Schedule, {
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

          this.em.persist(newSchedule);
          schedules.push(newSchedule);
        }

        await this.em.flush();

        return createServiceResponse(
          200,
          'Schedules created successfully',
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
      { populate: ['schedules'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const scheduleRepo = this.em.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ['users', 'admin'] }
    );

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    const scheduleOptions = await this.em.findOne(ScheduleOptions, {
      id: { $ne: null },
    });

    // Validaciones
    const isStateDisabled = schedule.state !== ScheduleState.AVAILABLE;
    const isHourDisabled = moment().isAfter(Number(schedule.startDate));
    const isFull = schedule.users.length >= schedule.maxUsers;
    const isBooked = user.schedules.getItems().some(s => s.id === schedule.id);
    const isUserBoss = currentUser.contextRole === UserRoleEnum.BOSS;
    const isUserCoachOfEvent =
      currentUser.contextRole === UserRoleEnum.COACH &&
      schedule.admin.id === currentUser.id;
    const maxBookings =
      user.schedules.length >=
      (scheduleOptions?.maxActiveReservations || Infinity);
    const maxBookingsToday =
      !scheduleOptions?.sameDayBookingAllowed &&
      user.schedules
        .getItems()
        .some(s =>
          moment(Number(s.startDate)).isSame(
            moment(Number(schedule.startDate)),
            'day'
          )
        );

    const maxAdvanceDate = moment()
      .add(scheduleOptions?.maxAdvanceBookingDays ?? 0, 'days')
      .startOf('day');

    const isAdvanceBookingDisabled =
      moment(Number(schedule.startDate)).isAfter(maxAdvanceDate) &&
      !scheduleOptions?.sameDayBookingAllowed;

    const disabled =
      (isStateDisabled ||
        isFull ||
        isHourDisabled ||
        (!isBooked &&
          (maxBookings || maxBookingsToday || isAdvanceBookingDisabled))) &&
      !(isUserBoss || isUserCoachOfEvent);

    if (disabled) {
      throw new BadRequestError('Schedule is not available for booking');
    }

    if (schedule.users.contains(user)) {
      throw new BadRequestError('User already in schedule');
    }

    schedule.users.add(user);
    this.em.persist(schedule);
    await this.em.flush();

    return createServiceResponse(200, 'User added to schedule', true, {
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
      { populate: ['users', 'admin'] }
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
        currentUser.contextRole === UserRoleEnum.BOSS
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

    if (!schedule.users.contains(user)) {
      throw new ForbiddenError('User not in schedule');
    }

    schedule.users.remove(user);
    this.em.persist(schedule);
    await this.em.flush();

    return createServiceResponse(200, 'User removed from schedule', true, {
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
      throw new InternalServerError('Error creating schedule');
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
      currentUser.contextRole !== UserRoleEnum.BOSS
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
      currentUser.contextRole !== UserRoleEnum.BOSS
    ) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    await this.em.removeAndFlush(schedule);

    return createServiceResponse(200, 'Schedule removed successfully', true);
  }

  /**
   * Actualizar opciones de schedule (solo BOSS)
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

    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    try {
      const scheduleOptionsRepo = this.em.getRepository(ScheduleOptions);
      let scheduleOptions = await scheduleOptionsRepo.findOne({
        id: { $ne: null },
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

  // ============= MÉTODOS PRIVADOS =============

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
