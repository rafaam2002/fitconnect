import crypto from "crypto";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import moment from "moment";
import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from "../../constants/subscriptions";
import { Message } from "../../entities/Message";
import { Schedule } from "../../entities/Schedule";
import { TrainingTask } from "../../entities/TraningITask";
import { User } from "../../entities/User";
import { UserWeight } from "../../entities/UserWeight";
import { ScheduleState, ScheduleType, UserRoleEnum } from "../../types/enums";
import {
  AddUserWeight,
  ChangeScheduleStatusProp,
  ContextProps,
  CreateTrainingTaskProps,
  FixMessageProps,
  GetConversationProps,
  GetMonthlyScheduleStats,
  GetPollProps,
  GetScheduleProps,
  GetScheduleRangeProps,
  GetTrainingTaskProps,
  GetUserWeightsProps,
  IdProps,
  MessageProps,
  RemoveScheduleProps,
  removeTrainingTaskProps,
  RemoveUserSheduleProps,
  RemoveUserWeight,
  ScheduleDevelopmentProps,
  ScheduleProps,
  ScheduleResumeRange,
  ScheduleStatsProps,
  UnfixMessageProps,
  updateScheduleOptionsProps,
  UserListProps,
  UserPictureProps,
  UserProps,
} from "../../types/resolvers";
import { sendPushNotification } from "../../utils/notifications";
import { createPictureUrl, getPresignedUrl } from "../../utils/presigned-urls";
import {
  createDateWithTime,
  createScheduleProgrammed,
} from "../../utils/schedules";
import { updateUserSchema } from "../../validation/schemas";
import { CustomResponse } from "./errors";

import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { withFilter } from "graphql-subscriptions";
import nodemailer from "nodemailer";
import { Poll } from "../../entities/Poll";
import { ScheduleOptions } from "../../entities/ScheduleOptions";
import { emailHtml } from "../../utils/emailHtml";
import { createCustomer, updateCustomer } from "./customer.resolver";

import { IResolvers } from "@graphql-tools/utils";
import { RefreshToken } from "../../entities/RefreshToken";
import { createAdminCompany } from "../../utils/company";
import { companyVerificationEmailHtml } from "../../utils/companyVerificationEmailHtml ";

dotenv.config();

const region = process.env.AWS_REGION || "eu-north-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // tu email
    pass: process.env.GMAIL_APP_PASS, // password o app password
  },
});

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

type AddScheduleProps = { scheduleId: string };

export const getSchedules = async (
  _: any,
  args: GetScheduleProps,
  context: ContextProps
) => {
  const { scheduleId, schedulesIds } = args;
  const { em, currentUser } = context;
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (scheduleId) {
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ["admin", "users"] }
    );
    if (!schedule) {
      return CustomResponse(404, "Schedule not found");
    } else {
      return CustomResponse(200, "Schedule found", true, { schedule });
    }
  }

  if (schedulesIds) {
    if (schedulesIds.length === 0)
      return CustomResponse(200, "Schedules not found", true, {
        schedules: [],
      });
    const schedules = await scheduleRepo.find(
      { id: { $in: schedulesIds } },
      { populate: ["admin", "users"] }
    );
    if (!schedules) {
      return CustomResponse(404, "Schedules not found");
    }
    return CustomResponse(200, "Schedules found", true, { schedules });
  }

  const schedules = await scheduleRepo.findAll({
    populate: ["admin", "users"],
  });

  return CustomResponse(200, "Schedules found", true, { schedules });
};

export const getSchedulesFromToday = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay },
    },
    { populate: ["users"] }
  );

  return CustomResponse(200, "Schedules found", true, { schedules });
};

export const getSchedulesResume = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay },
    },
    { populate: ["users"], orderBy: { startDate: "ASC" } }
  );

  const schedulesResume = schedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      state: schedule.state,
      ocupancy: schedule.users.length,
    };
  });

  return CustomResponse(200, "Schedules found", true, { schedulesResume });
};

export const getAdminSchedules = async (
  _: any,
  args: IdProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { id } = args;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["adminSchedules"] }
  );
  return user.adminSchedules;
};

export const getTodaySchedulesResume = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const todaySchedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay, $lte: endOfDay },
    },
    { populate: ["users"] }
  );

  const schedulesResume = todaySchedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      state: schedule.state,
      ocupancy: schedule.users.length,
    };
  });

  return CustomResponse(200, "Schedules found", true, { schedulesResume });
};

export const getSchedulesRange = async (
  _: any,
  args: GetScheduleRangeProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { startDate, endDate, mySchedules } = args;
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const startOfDay = moment(startDate).format("YYYY/MM/DD HH:mm:ss");
  const endOfDay = moment(endDate).format("YYYY/MM/DD HH:mm:ss");

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay, $lte: endOfDay },
    },
    { populate: ["users", "admin"] }
  );

  const sortSchedules = schedules.sort((a, b) => {
    return moment(a.startDate).unix() - moment(b.startDate).unix();
  });

  // sortSchedules.map((schedule) => {
  //   schedule.startDate = moment(
  //     new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
  //   ).toDate();

  //   schedule.endDate = moment(
  //     new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
  //   ).toDate();
  // });

  if (mySchedules) {
    const myUser = em.getReference(User, currentUser.id);
    const mySchedules = sortSchedules.filter(
      (schedule) => schedule.admin === myUser
    );

    return CustomResponse(200, "Schedules found", true, {
      schedules: mySchedules,
    });
  }

  return CustomResponse(200, "Schedules found", true, {
    schedules: sortSchedules,
  });
};

export const getSchedulesResumeRange = async (
  _: any,
  args: ScheduleResumeRange,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { startDate, endDate } = args;
  const scheduleRepo = em.getRepository(Schedule);
  const scheduleOptionsRepo = em.getRepository(ScheduleOptions);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const scheduleOptions = await scheduleOptionsRepo.findOne({
    id: { $ne: null },
  });

  const startOfDay = new Date(startDate);
  const endOfDay = new Date(endDate);

  const schedules: Schedule[] = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay, $lte: endOfDay },
    },
    { populate: ["users", "admin"] }
  );

  const sortSchedules = schedules.sort((a, b) => {
    return moment(a.startDate).unix() - moment(b.startDate).unix();
  });

  // sortSchedules.map((schedule) => {
  //   schedule.startDate = moment(
  //     new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
  //   ).toDate();

  //   schedule.endDate = moment(
  //     new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
  //   ).toDate();
  // });

  const schedulesResume = sortSchedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      state: schedule.state,
      ocupancy: schedule.users.length,
    };
  });

  // console.log(
  //   "all Param company?",
  //   sortSchedules.filter(
  //     (s) => s.company.id !== "30da0af2-1832-442a-afa4-10b0bfa08b83"
  //   ).length === 0
  // );

  return CustomResponse(200, "Schedules found", true, {
    schedulesResume,
    scheduleOptions,
  });
};

export const getScheduleOptions = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  const scheduleOptionRepo = em.getRepository(ScheduleOptions);
  const scheduleOptions: ScheduleOptions = await scheduleOptionRepo.findOne({
    company: currentUser.activeCompanyId,
  });

  return CustomResponse(200, "Schedule options found", true, {
    scheduleOptions,
  });
};

export const getSchedulesStats = async (
  _: any,
  args: ScheduleStatsProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { month } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  } else if (currentUser.contextRole !== UserRoleEnum.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const startOfMonth = moment().month(month).startOf("month").toDate();
  const endOfMonth = moment().month(month).endOf("month").toDate();

  const ScheduleRepo = em.getRepository(Schedule);
  const schedulesFirstMonth = await ScheduleRepo.find(
    {
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    },
    { fields: ["maxUsers", "startDate", "users"] }
  );

  // Agrupación y resumen (como en el ejemplo anterior)
  const groupedSchedulesFirstMonth = schedulesFirstMonth.reduce(
    (acc, schedule) => {
      const dayAndTime = moment(schedule.startDate).format("ddd HH:mm");

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
      (sum, schedule) => sum + schedule.users.length / schedule.maxUsers,
      0
    );

    const averageRatio = totalRatio / group.length;
    return {
      dayAndTime,
      ratio: averageRatio, // Media del ratio
    };
  });

  const startPastMonth = moment()
    .month(month - 1)
    .startOf("month")
    .toDate();
  const endPastMonth = moment()
    .month(month - 1)
    .endOf("month")
    .toDate();

  const schedulesPastMonth = await ScheduleRepo.find(
    {
      startDate: { $gte: startPastMonth, $lte: endPastMonth },
    },
    { fields: ["maxUsers", "startDate", "users"] }
  );

  // Agrupación y resumen (como en el ejemplo anterior)
  const groupedSchedulesPastMonth = schedulesPastMonth.reduce(
    (acc, schedule) => {
      const dayAndTime = moment(schedule.startDate).format("ddd HH:mm");

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
      (sum, schedule) => sum + schedule.users.length / schedule.maxUsers,
      0
    );

    const averageRatio = totalRatio / group.length;
    return {
      dayAndTime,
      ratio: averageRatio, // Media del ratio
    };
  });

  return CustomResponse(200, "Schedules found", true, {
    stats: [schedulesSummaryFirstMonth, schedulesSummaryPastMonth],
  });
};

export const getMonthlySchedules = async (
  _: any,
  args: GetMonthlyScheduleStats,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { month, startHour } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  } else if (currentUser.contextRole !== UserRoleEnum.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  const startOfMonth = moment().month(month).startOf("month").toDate();
  const endOfMonth = moment().month(month).endOf("month").toDate();
  const monthlySchedules = await em.find(
    Schedule,
    {
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    },
    { populate: ["users"] }
  );
  const matchHourSchedules = monthlySchedules.filter((schedule) => {
    return moment(Number(schedule.startDate)).format("ddd HH:mm") === startHour;
  });
  if (matchHourSchedules.length > 0)
    return CustomResponse(200, "Schedules found", true, {
      schedules: matchHourSchedules,
    });
  else return CustomResponse(404, "No schedules found");
};

export const createSchedule = async (
  _: any,
  args: ScheduleProps,
  context: ContextProps
) => {
  const { schedule } = args;
  const { em, currentUser } = context;
  const {
    title,
    description,
    startDate,
    endDate,
    maxUsers,
    repeatDays,
    age,
    admin,
    type = ScheduleType.STANDARD,
  } = schedule;

  const finalAge = age && age > 0 ? age : null;
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const adminRef = em.getReference(User, admin);

  if (repeatDays.length > 0) {
    const startHour = moment(startDate).subtract(1, "hours").format("HH:mm");
    const endHour = moment(endDate).subtract(1, "hours").format("HH:mm");

    return createScheduleProgrammed(
      {
        daysOfWeek: repeatDays,
        title,
        description,
        startHour,
        endHour,
        maxUsers,
        admin: adminRef,
        age: finalAge,
        type,
      },
      { em, currentUser }
    );
  } else {
    const newSchedule = em.create(Schedule, {
      title,
      description,
      age: finalAge,
      type,
      startDate,
      endDate,
      maxUsers,
      state: ScheduleState.AVAILABLE,
      admin: adminRef,
    });

    await em.persistAndFlush(newSchedule);

    try {
      return CustomResponse(200, "Schedule created successfully", true, {
        schedule: newSchedule,
      });
    } catch (error) {
      return CustomResponse(500, "Error creating schedule");
    }
  }
};

export const addUserToSchedule = async (
  _: any,
  args: AddScheduleProps,
  context: ContextProps
) => {
  const { scheduleId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  // const userReference = em.getReference(User, currentUser.id);
  const user: User = await em.findOne(
    User,
    { id: currentUser.id },
    { populate: ["schedules"] }
  );

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );
  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  const scheduleOptions: ScheduleOptions = em.findOne(ScheduleOptions, {
    id: { $ne: null },
  });

  const isStateDisabled = schedule.state !== ScheduleState.AVAILABLE;
  const isHourDisabled = moment().isAfter(Number(schedule.startDate));
  const isFull = schedule.users.length >= schedule.maxUsers;
  const isBooked = user.schedules.getItems().some((s) => s.id === schedule.id);
  const isUserBoss = currentUser.contextRole === UserRoleEnum.BOSS;
  const isUserCoachOfEvent =
    currentUser.contextRole === UserRoleEnum.COACH &&
    schedule.admin.id === currentUser.id;
  const maxBookings =
    user!.schedules!.length >= scheduleOptions.maxActiveReservations;

  const maxBookingsToday =
    !scheduleOptions?.sameDayBookingAllowed &&
    user.schedules
      .getItems()
      .some((s) =>
        moment(Number(s.startDate)).isSame(
          moment(Number(schedule.startDate)),
          "day"
        )
      );

  const maxAdvanceDate = moment()
    .add(scheduleOptions?.maxAdvanceBookingDays ?? 0, "days")
    .startOf("day");

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

  if (disabled)
    return CustomResponse(400, "Schedule is not available for booking", false, {
      schedule,
    });

  if (schedule.users.contains(user)) {
    return CustomResponse(400, "User already in schedule");
  }
  schedule.users.add(user);

  await em.persistAndFlush(schedule);

  return CustomResponse(200, "User added to schedule", true, {
    schedule,
  });
};

export const removeUserFromSchedule = async (
  _: any,
  args: RemoveUserSheduleProps,
  context: ContextProps
) => {
  const { scheduleId, userId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  let id = null;

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );

  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  if (userId) {
    if (
      userId === currentUser.id ||
      (currentUser.contextRole === UserRoleEnum.COACH &&
        userId === schedule.admin.id) ||
      currentUser.contextRole === UserRoleEnum.BOSS
    ) {
      id = userId;
    } else {
      return CustomResponse(
        403,
        "You are not authorized to perform this action"
      );
    }
  } else {
    id = currentUser.id;
  }

  const user = await em.findOne(User, { id });

  if (!schedule.users.contains(user)) {
    return CustomResponse(403, "User not in schedule");
  }
  schedule.users.remove(user);

  await em.persistAndFlush(schedule);

  return CustomResponse(200, "User removed from schedule", true, {
    schedule,
  });
};

export const createScheduleDevelopment = async (
  _: any,
  args: ScheduleDevelopmentProps,
  context: ContextProps
) => {
  const { scheduleDevelopment } = args;
  const { em, currentUser } = context;
  const { title, startTime, endTime, maxUsers } = scheduleDevelopment;
  let { state = ScheduleState.AVAILABLE } = scheduleDevelopment;

  if (state === null) state = ScheduleState.AVAILABLE;

  let newStartDate = createDateWithTime(startTime); // startTime es la cadena de tiempo pasada por parámetro, por ejemplo "11:30"
  let newEndDate = createDateWithTime(endTime); // endTime es la cadena de tiempo pasada por parámetro, por ejemplo "12:30"

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const userRepo = em.getRepository(User);
  const admin = em.getReference(User, currentUser.id);

  const newSchedule = em.create(Schedule, {
    title,
    startDate: newStartDate,
    endDate: newEndDate,
    maxUsers,
    state,
    admin,
  });

  await em.persistAndFlush(newSchedule);

  try {
    return CustomResponse(200, "Schedule created successfully", true, {
      schedule: newSchedule,
    });
  } catch (error) {
    return CustomResponse(500, "Error creating schedule");
  }
};

export const changeScheduleStatus = async (
  _: any,
  args: ChangeScheduleStatusProp,
  context: ContextProps
) => {
  const { scheduleId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users", "users.pushTokens"] }
  );

  if (!schedule) return CustomResponse(404, "Schedule not found");

  if (
    schedule.admin.id !== currentUser.id &&
    currentUser.contextRole !== UserRoleEnum.BOSS
  )
    return CustomResponse(403, "You are not authorized to perform this action");

  const newState =
    schedule.state === ScheduleState.AVAILABLE
      ? ScheduleState.CANCELLED
      : ScheduleState.AVAILABLE;
  schedule.state = newState;

  await em.persistAndFlush(schedule);

  if (newState === ScheduleState.CANCELLED) {
    const title = "Horario cancelado";
    const body = `El horario "${schedule.title}" ha sido cancelado.`;
    const data = {
      type: "schedule_cancelled",
      scheduleId: schedule.id,
    };

    schedule.users.getItems().forEach((user) => {
      if (user.pushTokens && user.pushTokens.length > 0) {
        user.pushTokens.getItems().forEach((pushToken) => {
          sendPushNotification(pushToken.token, title, body, data);
        });
      }
    });
  }

  return CustomResponse(200, "Schedule status changed successfully", true, {
    schedule,
  });
};

export const removeSchedule = async (
  _: any,
  args: RemoveScheduleProps,
  context: ContextProps
) => {
  const { scheduleId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne({ id: scheduleId });

  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  if (
    schedule.admin.id !== currentUser.id &&
    currentUser.contextRole !== UserRoleEnum.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  await em.removeAndFlush(schedule);

  return CustomResponse(200, "Schedule removed successfully", true);
};

export const updateScheduleOptions = async (
  _: any,
  { scheduleOptions: scheduleOptionsParams }: updateScheduleOptionsProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.contextRole !== UserRoleEnum.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const scheduleOptionsRepo = em.getRepository(ScheduleOptions);
  let scheduleOptions = await scheduleOptionsRepo.findOne({
    id: { $ne: null },
  });

  if (!scheduleOptions) {
    scheduleOptions = em.create(ScheduleOptions, {});
  }

  scheduleOptions.maxActiveReservations =
    scheduleOptionsParams.maxActiveReservations;
  scheduleOptions.maxAdvanceBookingDays =
    scheduleOptionsParams.maxAdvanceBookingDays;
  scheduleOptions.sameDayBookingAllowed =
    scheduleOptionsParams.sameDayBookingAllowed;

  try {
    await em.persistAndFlush(scheduleOptions);
    return CustomResponse(200, "Schedule options updated successfully", true, {
      scheduleOptions,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error updating schedule options");
  }
};

export const scheduleResolvers: IResolvers = {
  Query: {
    getSchedules,
    getSchedulesFromToday,
    getSchedulesResume,
    getTodaySchedulesResume,
    getSchedulesRange,
    getSchedulesResumeRange,
    getScheduleOptions,
    getSchedulesStats,
    getMonthlySchedules,
  },
  Mutation: {
    createSchedule,
    addUserToSchedule,
    removeUserFromSchedule,
    createScheduleDevelopment,
    changeScheduleStatus,
    removeSchedule,
    updateScheduleOptions,
  },
};
