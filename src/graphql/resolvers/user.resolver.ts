import { User } from "../../entities/User";
import { sendPushNotification } from "../../utils/notifications";
import jwt from "jsonwebtoken";
import { Message } from "../../entities/Message";
import { ScheduleState, ScheduleType, UserRole } from "../../types/enums";
import { Schedule } from "../../entities/Schedule";
import {
  createDateWithTime,
  createScheduleProgrammed,
} from "../../utils/schedules";
import { updateUserSchema } from "../../validation/schemas";
import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from "../../constants/subscriptions";
import moment from "moment";
import { CustomResponse } from "./errors";
import { GraphQLError } from "graphql";
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
import { TrainingTask } from "../../entities/TraningITask";
import { UserWeight } from "../../entities/UserWeight";
import {
  createPictureUrl,
  getPresignedUrl,
} from "../../utils/createPresignedUrls";

import nodemailer from "nodemailer";
import { emailHtml } from "../../utils/emailHtml";
import { ScheduleOptions } from "../../entities/ScheduleOptions";
import { createCustomer, updateCustomer } from "./customer.resolver";
import { Poll } from "../../entities/Poll";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { withFilter } from "graphql-subscriptions";

import { IResolvers } from "@graphql-tools/utils";

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

// ===== QUERY RESOLVERS =====
export const getUsers = async (
  _: any,
  args: UserListProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { textFilter, roleFilter, page, stateFilter } = args;
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const pagination = {
    limit: 50,
    offset: page * 50,
  };

  const userRepo = em.getRepository(User);

  let where: any = {};

  if (textFilter) {
    where.$or = [
      { nickname: { $ilike: `${textFilter}%` } },
      { name: { $ilike: `${textFilter}%` } },
      { surname: { $ilike: `${textFilter}%` } },
      { email: { $ilike: `${textFilter}%` } },
    ];
  }

  if (roleFilter) {
    where.role = roleFilter;
  }

  if (stateFilter) {
    stateFilter === "notActive"
      ? (where.isActive = false)
      : stateFilter === "blocked"
      ? (where.isBlocked = true)
      : stateFilter === "notVerified"
      ? (where.isVerified = false)
      : stateFilter === "new"
      ? (where.created_at = {
          $gte: new Date(Date.now() - 31 * 60 * 60 * 1000), // last 24 hours
        })
      : null;
  }

  const users = Object.keys(where).length
    ? await userRepo.find(where, {
        ...pagination,
      })
    : await userRepo.findAll({
        ...pagination,
      });

  const usersNotMe = users.filter((user) => user.id !== currentUser.id);
  return CustomResponse(200, "Users found", true, { users: usersNotMe });
};

export const me = async (_: any, args: any, context: ContextProps) => {
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  //falta conseguir el usuario actual
  const me: User | null = await userRepo.findOne(
    { id: currentUser.id },
    {
      populate: ["pictureUrl"],
    }
  );
  if (me) {
    return CustomResponse(200, "User found", true, { user: me });
  } else {
    return CustomResponse(404, "User not logged");
  }
};

export const findUser = async (_, args: IdProps, context: ContextProps) => {
  const { em } = context;
  const { id } = args;
  const userRepo = em.getRepository(User);
  const user = await userRepo.findOne({ id });

  if (!user) {
    return CustomResponse(404, "User not found");
  }

  return CustomResponse(200, "User found", true, { user });
};

export const getPromotions = async (
  _: any,
  args: IdProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["promotions"] }
  );
  return user.promotions;
};

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

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["adminSchedules"] }
  );
  return user.adminSchedules;
};

export const getNotifications = async (
  root: any,
  args: any,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["notifications"] }
  );

  return CustomResponse(200, "Notifications found", true, {
    notifications: user.notifications,
  });
};

export const getAdminPolls = async (
  _: any,
  args: IdProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["adminPolls"] }
  );
  return user.adminPolls;
};

export const getPolls = async (
  _: any,
  args: GetPollProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { pollId, filter } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const pollRepo = em.getRepository(Poll);

  if (pollId) {
    const poll = await pollRepo.findOne({ id: pollId });
    if (!poll) {
      return CustomResponse(404, "Poll not found");
    }
    return CustomResponse(200, "Poll found", true, { poll });
  }

  if (filter) {
    const polls = await pollRepo.find(
      {
        endDate: { $gte: filter.since },
      },
      { populate: ["admin"] }
    );

    return CustomResponse(200, "Polls found", true, { polls });
  }

  const polls = await pollRepo.find(
    {
      endDate: { $gte: moment().format("YYYY-MM-DD HH:mm:ss") },
    },
    { populate: ["admin", "pollVotes.user"] }
  );

  return CustomResponse(200, "Polls found", true, { polls });
};

export const getConversation = async (
  _: any,
  args: GetConversationProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { otherUserId, page = 0, limit = 50, isForumMessage = false } = args;

  if (!currentUser ) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  const messageRepo = em.getRepository(Message);

  let forumFields = [];
  if (isForumMessage) {
    //forum
    forumFields = ["isFixed", "fixedEndDate", "fixedAdmin"]; //this fields are only available in forum
  }

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
  ]; //just mandatory fields to optimize query

  //buscar 1 mensaje de cada conversacion
  if (!otherUserId && !isForumMessage) {
    // Si no se especifica otro usuario, se buscan todas
    //  las conversaciones del currentUser:
    const rawUserIds: { otheruser: string }[] = await em
      .getConnection()
      .execute(
        `
          SELECT DISTINCT 
            CASE 
              WHEN sender_id = ? THEN receiver_id 
              ELSE sender_id 
            END AS otherUser
          FROM message
          WHERE sender_id = ? OR receiver_id = ? 
       `,
        [currentUser.id, currentUser.id, currentUser.id]
      );

    let otherUserIds = rawUserIds.map((row) => row.otheruser);
    // otherUserIds = otherUserIds.filter((id) => id !== process.env.DB_FORUM_ID); // Excluir el foro si está presente

    // Para cada otro usuario, se busca la conversación con el currentUser:
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
          orderBy: { created_at: "DESC" }, // Opcional: para ordenarlos de manera cronológica.
          populate: ["sender", "receiver"], // Si necesitas cargar las relaciones.
          limit: limit,
          fields,
        }
      );
    });

    const conversationsGrouped: Array<Message[]> = await Promise.all(
      conversationPromises
    );

    // const forumMessages = await messageRepo.find(
    //   {
    //     receiver: process.env.DB_FORUM_ID,
    //   },
    //   {
    //     orderBy: { created_at: "DESC" },
    //     limit: limit,
    //     offset: page * limit,
    //     populate: ["sender", "receiver"],
    //     fields: fields,
    //   }
    // );

    // conversationsGrouped.push(forumMessages);

    // Ordenar las conversaciones por la fecha del mensaje más reciente (de forma comprimida)
    conversationsGrouped.sort((a, b) => {
      if (!a.length || !b.length) return b.length - a.length;
      return (
        new Date(b[0].created_at).getTime() -
        new Date(a[0].created_at).getTime()
      );
    });

    return CustomResponse(200, "Conversations found", true, {
      conversations: conversationsGrouped,
    });
  } else {
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
    const messages = await messageRepo.find(filter, {
      orderBy: { created_at: "DESC" },
      limit: limit,
      offset: page * limit,
      populate: ["sender", "receiver"],
      fields,
    });

    const hasMore = messages.length === limit;

    const messagesByDay = messages.reduce((groups, message) => {
      // Formatea la fecha (por ejemplo, '2025-04-09') para agrupar por día
      const day = moment(message.created_at).format("YYYY-MM-DD");
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(message);
      return groups;
    }, {} as Record<string, typeof messages>);

    // Si deseas obtener un array de arrays (donde cada posición corresponde a un grupo)
    const groupedMessages = Object.values(messagesByDay);

    return CustomResponse(200, "Conversations found", true, {
      conversation: {
        messages: groupedMessages,
        hasMore,
      },
    });
  }
};

export const sendEmailVerification = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const emailVerificationTk = jwt.sign(
    { id: currentUser.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: currentUser.email,
    subject: "Confirma tu cuenta",
    html: emailHtml(emailVerificationTk),
  });

  return CustomResponse(200, "Verification email sent", true);
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

  console.log(
    "all Param company?",
    sortSchedules.filter(
      (s) => s.company.id !== "30da0af2-1832-442a-afa4-10b0bfa08b83"
    ).length === 0
  );

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
  const scheduleOptions = await scheduleOptionRepo.findAll();

  return CustomResponse(200, "Schedule options found", true, {
    scheduleOptions: scheduleOptions[0],
  });
};

export const getAdminStats = async (
  _: any,
  arg: any,
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
  if (currentUser.currentRole !== UserRole.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  const userRepo = em.getRepository(User);
  const knex = em.getKnex();

  const result = await knex("user as u").select([
    knex.raw("COUNT(u.id) as totalusers"),
    knex.raw("COUNT(CASE WHEN u.is_blocked = true THEN 1 END) as blockedusers"),
    knex.raw(
      "COUNT(CASE WHEN u.is_active = false THEN 1 END) as notactiveusers"
    ),
    knex.raw(
      "COUNT(CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as newusers"
    ),
  ]);

  const stats = {
    users: {
      totalUsers: result[0].totalusers,
      blockedUsers: result[0].blockedusers,
      notActiveUsers: result[0].notactiveusers,
      newUsers: result[0].newusers,
    },
    schedules: 0,
    polls: 0,
    plans: 0,
    subscriptions: 0,
    transactions: 0,
    notifications: 0,
  };
  return CustomResponse(200, "Stats found", true, { stats });
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
  } else if (currentUser.currentRole !== UserRole.BOSS) {
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
  } else if (currentUser.currentRole !== UserRole.BOSS) {
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

export const getTrainingTasks = async (
  _: any,
  args: GetTrainingTaskProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { userId, dateRange } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const trainingTaskRepo = em.getRepository(TrainingTask);
  const userReference = em.getReference(User, userId);

  const trainingTasks = await trainingTaskRepo.find(
    {
      $and: [
        {
          $or: [
            { user: userReference },
            {
              user: null,
            },
          ],
        }, // Condición adicional si es necesaria
        {
          $or: [
            { date: { $gte: dateRange[0], $lte: dateRange[1] } }, // Dentro del rango de fechas
            { repeat: true }, // Con repeat a true
          ],
        },
      ],
    },

    { populate: ["user"] }
  );

  return CustomResponse(200, "Training tasks found", true, {
    trainingTasks,
  });
};

export const getUserWeights = async (
  _: any,
  args: GetUserWeightsProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { userId, dateRange } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const userRepo = em.getRepository(User);
  const user = await userRepo.findOne(
    { id: userId },
    { populate: ["userWeights"] }
  );

  if (!user) {
    return CustomResponse(404, "User not found");
  }

  return CustomResponse(200, "User weights found", true, {
    userWeights: user.userWeights,
  });
};

// ===== MUTATIONS RESOLVERS =====
export const createUser = async (_, args: UserProps, context: ContextProps) => {
  const { user } = args;
  const { em } = context;
  const userRepo = em.getRepository(User);

  if (!user.email || !user.password || !user.nickname) {
    return CustomResponse(400, "Please provide all required fields");
  }

  const existingUser = await userRepo.findOne({
    $or: [{ email: user.email }, { nickname: user.nickname }],
  });

  if (existingUser) {
    return CustomResponse(400, "User already exists");
  }

  const newUser = em.create(User, {
    ...user,
  });
  try {
    const emailVerificationTk = jwt.sign(
      { id: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "rafaam.2002@gmail.com",
      subject: "Confirma tu cuenta",
      html: emailHtml(emailVerificationTk),
    });
    await em.persistAndFlush(newUser);
    const stripeData = {
      customer: {
        userId: newUser.id,
        phoneNumber: 123456789,
        name: newUser.nickname,
        email: newUser.email,
      },
    };

    await createCustomer(_, stripeData, context);

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return CustomResponse(200, "User created successfully", true, {
      user: newUser,
      tokens: {
        token,
      },
    });
  } catch (error) {
    if (error.code === "EAUTH")
      return CustomResponse(
        500,
        `Error sending verification email ${error.message}`
      );
    else
      return CustomResponse(
        500,
        `Error creating user ${error.name}, column: ${error.column}`
      );
  }
};

export const updateUser = async (_, args: UserProps, context: ContextProps) => {
  const { user: fields, userId } = args;
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);
  const {
    name,
    email,
    surname,
    nickname,
    phoneNumber,
    isActive,
    isBlocked,
    // role,
  } = fields;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.id !== userId && currentUser.currentRole !== UserRole.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  const updateUser = await userRepo.findOne({ id: userId });

  const oldEmail = updateUser.email;

  if (!updateUser) {
    return CustomResponse(404, "User not found");
  }

  updateUser.name = name;
  updateUser.email = email;
  updateUser.surname = surname;
  updateUser.nickname = nickname;
  updateUser.phoneNumber = phoneNumber || updateUser.phoneNumber;
  updateUser.isActive = isActive || updateUser.isActive;
  updateUser.isBlocked = isBlocked || updateUser.isBlocked;
  // updateUser.role = role || updateUser.role;

  try {
    // Validar los datos de entrada
    updateUserSchema.parse(updateUser);
  } catch (error) {
    return CustomResponse(400, `Validation Error ${error.message}`, false, {
      user: null,
    });
  }

  if (oldEmail !== email) {
    try {
      const usersWithexistingEmail = await userRepo.findOne({ email });
      if (usersWithexistingEmail.length > 1) {
        return CustomResponse(400, "Email already exists");
      }
    } catch (error) {
      return CustomResponse(
        500,
        `Error checking existing email: ${error.message}`,
        false,
        { user: null }
      );
    }
  }

  const existingNickName = await userRepo.find({ nickname });

  if (existingNickName.length > 1) {
    return CustomResponse(400, "Nickname already exists");
  }

  try {
    await em.persistAndFlush(updateUser);
    const stripeData = {
      customer: {
        email: updateUser.email,
        name: updateUser.name,
        phoneNumber: updateUser.phoneNumber,
      },
    };
    await updateCustomer(_, stripeData, context);

    return CustomResponse(200, "User updated successfully", true, {
      user: updateUser,
    });
  } catch (error) {
    return CustomResponse(500, "Error updating user", false, { user: null });
  }
};

export const updateUserPicture = async (
  _: any,
  args: UserPictureProps,
  context: ContextProps
) => {
  const { userId, picture } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.id !== userId && currentUser.currentRole !== UserRole.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const userRepo = em.getRepository(User);
  const updateUser: User = await userRepo.findOne({ id: userId });

  if (!updateUser) {
    return CustomResponse(404, "User not found");
  }

  if (!updateUser.pictureUrl) {
    const pictureUrl = await createPictureUrl(
      em,
      {
        id: userId,
        name: picture,
        type: "user",
      },
      await getPresignedUrl(picture)
    );
    updateUser.pictureUrl = pictureUrl;
  } else {
    //updateUser.pictureUrl.name = picture;
    updateUser.pictureUrl.url = await getPresignedUrl(picture);
  }
  try {
    em.persistAndFlush(updateUser);

    return CustomResponse(200, "User updated successfully", true, {
      user: updateUser,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error updating user", false, { user: null });
  }
};

export const removeUser = async (_, args, context: ContextProps) => {
  const { id } = args;
  const { em } = context;

  if (!id) {
    return CustomResponse(400, "Please provide a user id");
  }
  const user = em.getReference(User, id);

  if (!user) {
    return CustomResponse(404, "User not found");
  }

  await em.removeAndFlush(user);

  return user;
};

export const createMessage = async (
  _: any,
  args: MessageProps,
  context: ContextProps
) => {
  const { message } = args;
  const { em, currentUser } = context;
  const {
    text,
    receiverId,
    isFixed,
    fixedDuration = null,
    isForumMessage = false,
  } = message;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (isFixed && currentUser.currentRole === UserRole.STANDARD)
    return CustomResponse(403, "You are not authorized to perform this action");

  if (isFixed && !message.isForumMessage)
    return CustomResponse(
      403,
      "You can only fix messages in the forum",
      false,
      { user: null }
    );

  try {
    const receiver = receiverId
      ? await em.findOne(User, { id: receiverId }, { populate: ["pushTokens"] })
      : null;
    const newMessage = em.create(Message, {
      text,
      receiver,
      sender: em.getReference(User, currentUser.id),
      isFixed: !!isFixed,
      fixedDuration,
      isForumMessage,
    });
    await em.persistAndFlush(newMessage);

    if (isForumMessage) {
      const users = await em.find(
        User,
        {
          id: { $ne: currentUser.id },
          isBlocked: false,
          isActive: true,
        },
        { populate: ["pushTokens"] }
      );
      const title = "Nuevo mensaje en el foro";
      const body = `${currentUser.nickname}: ${text}`;
      const data = {
        type: "new_message",
        messageId: newMessage.id,
        senderId: currentUser.id,
      };

      users.forEach((user) => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.getItems().forEach((pushToken) => {
            sendPushNotification(pushToken.token, title, body, data);
          });
        }
      });
    } else if (
      receiver &&
      receiver.pushTokens &&
      receiver.pushTokens.length > 0
    ) {
      const title = `Nuevo mensaje de ${currentUser.nickname}`;
      const body = text;
      const data = {
        type: "new_message",
        messageId: newMessage.id,
        senderId: currentUser.id,
      };
      receiver.pushTokens.getItems().forEach((pushToken) => {
        sendPushNotification(pushToken.token, title, body, data);
      });
    }

    myPubsub.publish(MESSAGE_EVENT, { newMessage });
    return CustomResponse(200, "Message created successfully", true, {
      sms: newMessage,
    });
  } catch (error) {
    console.error("Error creating message", error);
    return CustomResponse(500, "Error creating message", false);
  }
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
  if (currentUser.currentRole === UserRole.STANDARD) {
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
  const isUserBoss = currentUser.currentRole === UserRole.BOSS;
  const isUserCoachOfEvent =
    currentUser.currentRole === UserRole.COACH &&
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
      (currentUser.currentRole === UserRole.COACH &&
        userId === schedule.admin.id) ||
      currentUser.currentRole === UserRole.BOSS
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

export const fixMessage = async (
  _: any,
  args: FixMessageProps,
  context: ContextProps
) => {
  const { messageId, fixedEndDate } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }

  if (
    currentUser.currentRole !== UserRole.BOSS &&
    message.sender.id !== currentUser.id
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  message.isFixed = true;
  message.fixedEndDate = fixedEndDate;
  message.fixedAdmin = em.getReference(User, currentUser.id);

  await em.persistAndFlush(message);

  myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

  return CustomResponse(200, "Message fixed succesfully", true);
};

export const unfixMessage = async (
  _: any,
  args: UnfixMessageProps,
  context: ContextProps
) => {
  const { messageId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message: Message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }
  if (
    currentUser.currentRole === UserRole.COACH &&
    message.fixedAdmin.id !== currentUser.id
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  message.isFixed = false;
  message.fixedEndDate = null;

  em.persist(message);
  await em.flush();

  myPubsub.publish(FIXED_MESSAGE_EVENT, { message });

  return CustomResponse(200, "Message unfixed successfully", true);
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
    currentUser.currentRole !== UserRole.BOSS
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

export const createTrainingTask = async (
  _: any,
  args: CreateTrainingTaskProps,
  context: ContextProps
) => {
  const { content, userId, date, repeat = false } = args.trainingTask;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const userReference = userId && em.getReference(User, userId);

  const newTrainingTask = em.create(TrainingTask, {
    content,
    user: userReference,
    repeat,
    date,
  });

  try {
    await em.persistAndFlush(newTrainingTask);

    const title = "¡Nueva tarea de entrenamiento!";
    const body = content;
    const data = {
      type: "new_training_task",
      trainingTaskId: newTrainingTask.id,
    };

    if (userId) {
      // Send to specific user
      const user = await em.findOne(
        User,
        { id: userId },
        { populate: ["pushTokens"] }
      );
      if (user && user.pushTokens && user.pushTokens.length > 0) {
        user.pushTokens.getItems().forEach((pushToken) => {
          sendPushNotification(pushToken.token, title, body, data);
        });
      }
    } else {
      // Send to all premium users
      const users = await em.find(
        User,
        { role: UserRole.PREMIUM },
        { populate: ["pushTokens"] }
      );
      users.forEach((user) => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.getItems().forEach((pushToken) => {
            sendPushNotification(pushToken.token, title, body, data);
          });
        }
      });
    }

    return CustomResponse(200, "Training task created successfully", true, {
      trainingTask: newTrainingTask,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error creating training task");
  }
};

export const removeTrainingTask = async (
  _: any,
  args: removeTrainingTaskProps,
  context: ContextProps
) => {
  const { taskId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const trainingTaskRepo = em.getRepository(TrainingTask);
  const trainingTask = await trainingTaskRepo.findOne({ id: taskId });

  if (!trainingTask) {
    return CustomResponse(404, "Training task not found");
  }

  await em.removeAndFlush(trainingTask);

  return CustomResponse(200, "Training task removed successfully", true);
};

export const addUserWeight = async (
  _: any,
  args: AddUserWeight,
  context: ContextProps
) => {
  const { weight, date, userId } = args.userWeight;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentRole === UserRole.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const userReference = em.getReference(User, userId);

  const newWeight = em.create(UserWeight, {
    weight,
    date,
    user: userReference,
  });

  try {
    await em.persistAndFlush(newWeight);
    return CustomResponse(200, "Weight added successfully", true, {
      weight: newWeight,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error adding weight");
  }
};

export const removeUserWeight = async (
  _: any,
  args: RemoveUserWeight,
  context: ContextProps
) => {
  const { userWeightId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const userWeightRepo = em.getRepository(UserWeight);
  const userWeight = await userWeightRepo.findOne({ id: userWeightId });

  if (!userWeight) {
    return CustomResponse(404, "User weight not found");
  }
  if (
    userWeight.user.id !== currentUser.id &&
    currentUser.currentRole !== UserRole.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  await em.removeAndFlush(userWeight);

  return CustomResponse(200, "User weight removed successfully", true);
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
    currentUser.currentRole !== UserRole.BOSS
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

  if (currentUser.currentRole !== UserRole.BOSS) {
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

// ===== SUBSCRIPTION RESOLVERS =====
export const newMessage = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      const result =
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver.isForumMessage;

      return result;
    }
  ),
};

export const fixedMessages = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(FIXED_MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      // Suponiendo que payload.newMessage contiene sender y receiver con sus respectivos ids.
      return (
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver.isForumMessage
      );
    }
  ),
};

export const userResolvers: IResolvers = {
  Query: {
    me,
    findUser,
    // getPromotions,
    getSchedules,
    getSchedulesFromToday,
    getSchedulesResume,
    // getAdminSchedules,
    getNotifications,
    getConversation,
    sendEmailVerification,
    getTodaySchedulesResume,
    getSchedulesRange,
    getSchedulesResumeRange,
    getScheduleOptions,
    getAdminStats,
    getSchedulesStats,
    getMonthlySchedules,
    getTrainingTasks,
    getUserWeights,
    getUsers,
    getPolls,
  },
  Mutation: {
    createUser,
    updateUser,
    updateUserPicture,
    // removeUser,
    createMessage,
    createSchedule,
    addUserToSchedule,
    removeUserFromSchedule,
    createScheduleDevelopment,
    fixMessage,
    unfixMessage,
    changeScheduleStatus,
    createTrainingTask,
    removeTrainingTask,
    addUserWeight,
    removeUserWeight,
    removeSchedule,
    updateScheduleOptions,
  },
  Subscription: {
    fixedMessages,
    newMessage,
  },
  User: {
    contextRole: (
      parent: User,
      _: any,
      context: ContextProps
    ): UserRole | null => {
      const { currentUser } = context;

      // Si no hay usuario autenticado (ej. en login), devolver el rol de la membresía activa del parent
      if (!currentUser) {
        return parent.activeMembership?.role || null;
      }

      // Si el usuario que consulta no tiene una membresía activa, no hay contexto de compañía.
      if (!currentUser.activeMembership) {
        // Si el usuario que se está resolviendo es el mismo que consulta, devuelve el rol de su propia membresía activa.
        if (parent.id === currentUser.id) {
          return parent.activeMembership?.role || null;
        }
        return null;
      }

      const requestingUserCompanyId = currentUser.activeMembership.company.id;

      // Busca la membresía del usuario 'parent' que coincide con la compañía del usuario que consulta.
      const membershipInContext = parent.memberships[0]; // con el filtro de membresias, solo traera la de la compañia en contexto
      // .getItems()
      // .find((m) => m.company.id === requestingUserCompanyId);

      return membershipInContext ? membershipInContext.role : null;
    },
  },
};
