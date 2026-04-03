import { IResolvers } from '@graphql-tools/utils';
import dotenv from 'dotenv';

import {
  createScheduleDataType,
  ScheduleService,
} from '../../services/schedule.service';
import {
  AddScheduleProps,
  ChangeScheduleStatusProp,
  ContextProps,
  GetMonthlyScheduleStats,
  GetScheduleProps,
  GetScheduleRangeProps,
  GetUserSchedulesProps,
  IdProps,
  RemoveScheduleProps,
  RemoveUserSheduleProps,
  ScheduleDevelopmentProps,
  ScheduleProps,
  ScheduleResumeRange,
  ScheduleStatsProps,
  updateScheduleOptionsProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import { schedulesPermissions } from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

dotenv.config();

// ===== QUERY RESOLVERS =====

export const getSchedules = async (
  _: any,
  args: GetScheduleProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleId, schedulesIds } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedules(
      currentUser,
      scheduleId,
      schedulesIds
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getUserSchedules = async (
  _: any,
  args: GetUserSchedulesProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { userId, past } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getUserSchedules(currentUser, userId, past);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSchedulesFromToday = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedulesFromToday(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSchedulesResume = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedulesResume(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getAdminSchedules = async (
  _: any,
  __: IdProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getAdminSchedules(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getTodaySchedulesResume = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getTodaySchedulesResume(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSchedulesRange = async (
  _: any,
  args: GetScheduleRangeProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { startDate, endDate, mySchedules } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedulesRange(
      currentUser,
      startDate,
      endDate,
      mySchedules
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSchedulesResumeRange = async (
  _: any,
  args: ScheduleResumeRange,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { startDate, endDate } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedulesResumeRange(
      currentUser,
      startDate,
      endDate
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getScheduleOptions = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getScheduleOptions(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSchedulesStats = async (
  _: any,
  args: ScheduleStatsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { month } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getSchedulesStats(currentUser, month);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getMonthlySchedules = async (
  _: any,
  args: GetMonthlyScheduleStats,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { month, startHour } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.getMonthlySchedules(
      currentUser,
      month,
      startHour
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createSchedule = async (
  _: any,
  args: ScheduleProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { schedule } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.createSchedule({
      ...schedule,
      currentUser,
    } as createScheduleDataType);
  } catch (error: any) {
    return handleError(error);
  }
};

export const addUserToSchedule = async (
  _: any,
  args: AddScheduleProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleId } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.addUserToSchedule(currentUser, scheduleId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removeUserFromSchedule = async (
  _: any,
  args: RemoveUserSheduleProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleId, userId } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.removeUserFromSchedule(
      currentUser,
      scheduleId,
      userId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const createScheduleDevelopment = async (
  _: any,
  args: ScheduleDevelopmentProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleDevelopment } = args;
    const { title, startTime, endTime, maxUsers, state } = scheduleDevelopment;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.createScheduleDevelopment(
      currentUser,
      title,
      startTime,
      endTime,
      maxUsers,
      state
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const changeScheduleStatus = async (
  _: any,
  args: ChangeScheduleStatusProp,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleId } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.changeScheduleStatus(currentUser, scheduleId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removeSchedule = async (
  _: any,
  args: RemoveScheduleProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleId } = args;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.removeSchedule(currentUser, scheduleId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateScheduleOptions = async (
  _: any,
  args: updateScheduleOptionsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { scheduleOptions } = args;
    const {
      maxActiveReservations,
      maxAdvanceBookingDays,
      sameDayBookingAllowed,
      fullOpenHours,
    } = scheduleOptions;

    const scheduleService = new ScheduleService(em);
    return await scheduleService.updateScheduleOptions(
      currentUser,
      maxActiveReservations,
      maxAdvanceBookingDays,
      sameDayBookingAllowed,
      fullOpenHours
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const scheduleResolvers: IResolvers = {
  Query: {
    getSchedules,
    getSchedulesFromToday: withPermissions(
      schedulesPermissions.READ,
      getSchedulesFromToday
    ),
    getSchedulesResume: withPermissions(
      schedulesPermissions.READ,
      getSchedulesResume
    ),
    getTodaySchedulesResume: withPermissions(
      schedulesPermissions.READ,
      getTodaySchedulesResume
    ),
    getSchedulesRange,
    getSchedulesResumeRange,
    getScheduleOptions: withPermissions(
      schedulesPermissions.READ,
      getScheduleOptions
    ),
    getSchedulesStats: withPermissions(
      schedulesPermissions.READ,
      getSchedulesStats
    ),
    getMonthlySchedules: withPermissions(
      schedulesPermissions.READ,
      getMonthlySchedules
    ),
    getUserSchedules,
  },
  Mutation: {
    createSchedule: withPermissions(
      schedulesPermissions.CREATE,
      createSchedule
    ),
    addUserToSchedule: withPermissions(
      schedulesPermissions.READ,
      addUserToSchedule
    ),
    removeUserFromSchedule: withPermissions(
      schedulesPermissions.READ,
      removeUserFromSchedule
    ),
    createScheduleDevelopment: withPermissions(
      schedulesPermissions.CREATE,
      createScheduleDevelopment
    ),
    changeScheduleStatus: withPermissions(
      schedulesPermissions.UPDATE,
      changeScheduleStatus
    ),
    removeSchedule: withPermissions(
      schedulesPermissions.DELETE,
      removeSchedule
    ),
    updateScheduleOptions: withPermissions(
      schedulesPermissions.UPDATE,
      updateScheduleOptions
    ),
  },
};
