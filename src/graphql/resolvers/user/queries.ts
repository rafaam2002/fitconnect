import { User } from "../../../entities/User";
import { UserRol } from "../../../types/enums";
import { Poll } from "../../../entities/Poll";
import { Message } from "../../../entities/Message";
import { CustomResponse } from "../errors";
import { Schedule } from "../../../entities/Schedule";
import { ScheduleOptions } from "../../../entities/ScheduleOptions";
import moment from "moment";
import {
  ContextProps,
  GetConversationProps,
  GetMonthlyScheduleStats,
  GetPollProps,
  GetScheduleProps,
  GetScheduleRangeProps,
  GetTrainingTaskProps,
  GetUserWeightsProps,
  IdProps,
  ScheduleResumeRange,
  ScheduleStatsProps,
  UserListProps,
} from "../../../types/resolvers";
import { TrainingTask } from "../../../entities/TraningITask";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { emailHtml } from "../../../utils/emailHtml";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";

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

export const getUsers = async (
  _: any,
  args: UserListProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { textFilter, rolFilter, page, stateFilter } = args;
  if (!currentUser) {
    return CustomResponse(401, "Please login");
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

  if (rolFilter) {
    where.rol = rolFilter;
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
    ? await userRepo.find(where, pagination)
    : await userRepo.findAll(pagination);

  const usersNotMe = users.filter((user) => user.id !== currentUser.id);
  return CustomResponse(200, "Users found", true, { users: usersNotMe });
};

export const me = async (_: any, args: any, context: ContextProps) => {
  const { em, currentUser } = context;
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
    return CustomResponse(401, "Please login");
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
    { populate: ["admin"] }
  );

  return CustomResponse(200, "Polls found", true, { polls });
};

export const getConversation = async (
  _: any,
  args: GetConversationProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { otherUserId, page = 0, limit = 50 } = args;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
  const messageRepo = em.getRepository(Message);

  let forumFields = [];
  if (otherUserId === process.env.DB_FORUM_ID || !otherUserId) {
    //forum
    forumFields = ["isFixed", "fixedEndDate", "fixedAdmin"]; //this fields are only available in forum
  }

  const fields = [
    "id",
    "sender.id",
    "sender.profilePicture",
    "sender.nickname",
    "sender.rol",
    "receiver.id",
    "receiver.profilePicture",
    "receiver.nickname",
    "receiver.rol",
    "text",
    "created_at",
    ...forumFields,
  ]; //just mandatory fields to optimize query

  if (!otherUserId) {
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
    otherUserIds = otherUserIds.filter((id) => id !== process.env.DB_FORUM_ID); // Excluir el foro si está presente

    // Para cada otro usuario, se busca la conversación con el currentUser:
    const conversationPromises = otherUserIds.map((otherId) => {
      return messageRepo.find(
        {
          $or: [
            { sender: currentUser.id, receiver: otherId },
            { sender: otherId, receiver: currentUser.id },
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

    const forumMessages = await messageRepo.find(
      {
        receiver: process.env.DB_FORUM_ID,
      },
      {
        orderBy: { created_at: "DESC" },
        limit: limit,
        offset: page * limit,
        populate: ["sender", "receiver"],
        fields: fields,
      }
    );

    conversationsGrouped.push(forumMessages);

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
    const filter =
      otherUserId !== process.env.DB_FORUM_ID
        ? {
            $or: [
              { sender: currentUser.id, receiver: otherUserId },
              { sender: otherUserId, receiver: currentUser.id },
            ],
          }
        : {
            receiver: process.env.DB_FORUM_ID,
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
  }

  const scheduleOptions = await scheduleOptionsRepo.findOne({
    id: { $ne: null },
  });

  const startOfDay = new Date(startDate);
  const endOfDay = new Date(endDate);

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

  const schedulesResume = sortSchedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      state: schedule.state,
      ocupancy: schedule.users.length,
    };
  });

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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
  }
  if (currentUser.rol !== UserRol.BOSS) {
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
    return CustomResponse(401, "Please login");
  } else if (currentUser.rol !== UserRol.BOSS) {
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
    return CustomResponse(401, "Please login");
  } else if (currentUser.rol !== UserRol.BOSS) {
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
    return CustomResponse(401, "Please login");
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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
