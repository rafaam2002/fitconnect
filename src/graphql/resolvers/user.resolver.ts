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

// ===== QUERY RESOLVERS =====
export const getUsers = async (
  _: any,
  args: UserListProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { query, roleFilter, page, stateFilter } = args;
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

  if (query) {
    where.$or = [
      { nickname: { $ilike: `${query}%` } },
      { name: { $ilike: `${query}%` } },
      { surname: { $ilike: `${query}%` } },
      { email: { $ilike: `${query}%` } },
    ];
  }

  if (roleFilter) {
    where.roles = { role: { $in: roleFilter } };
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
      : stateFilter === "pending"
      ? (where.pendingCompanies = { id: currentUser.activeCompanyId })
      : null;
  }

  let users: User[] = [];
  try {
    users = Object.keys(where).length
      ? await userRepo.find(where, {
          ...pagination,
        })
      : await userRepo.findAll({
          ...pagination,
        });
  } catch (error) {
    console.error(error);
  }

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
      populate: ["schedules.id", "schedules.startDate", "companies"],
    }
  );
  if (me) {
    return CustomResponse(200, "User found", true, {
      user: me,
      companies: me.companies.getItems(),
    });
  } else {
    return CustomResponse(404, "User not logged");
  }
};

export const setCompanyMe = async (
  _: any,
  {
    companyId,
  }: {
    companyId: string;
  },
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
  const me: User | null = await userRepo.findOne(
    { id: currentUser.id },
    {
      populate: ["schedules.id", "schedules.startDate"],
    }
  );

  const userForCompanies: User | null = await userRepo.findOne(
    { id: currentUser.id },
    {
      filters: false,
    }
  );

  if (me) {
    me.activeCompanyId = companyId;
    await em.persistAndFlush(me);
    return CustomResponse(200, "User found", true, {
      user: me,
      companies: userForCompanies.companies.getItems(),
    });
  } else {
    return CustomResponse(404, "User not logged");
  }
};

export const findUser = async (_, args: IdProps, context: ContextProps) => {
  const { em } = context;
  const { id } = args;
  const userRepo = em.getRepository(User);
  const user = await userRepo.findOne(
    { id },
    {
      populate: ["pendingCompanies"],
    }
  );

  if (!user) {
    return CustomResponse(404, "User not found");
  }

  return CustomResponse(200, "User found", true, {
    user: {
      ...user,
      isPending: user.pendingCompanies.length > 0,
    },
  });
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



export const getConversation = async (
  _: any,
  args: GetConversationProps,
  context: ContextProps
) => {
  const { em, currentUser } = context;
  const { otherUserId, page = 0, limit = 50, isForumMessage = false } = args;

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
  if (currentUser.contextRole !== UserRoleEnum.BOSS) {
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

  const pendingUsers = await em.count(User, {
    pendingCompanies: { id: currentUser.activeCompanyId },
  });

  const stats = {
    users: {
      totalUsers: result[0].totalusers,
      blockedUsers: result[0].blockedusers,
      notActiveUsers: result[0].notactiveusers,
      newUsers: result[0].newusers,
      pendingUsers,
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

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
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
  const { user, company } = args;
  const { em } = context;
  const userRepo = em.getRepository(User);

  if (!user.email || !user.password || !user.nickname) {
    return CustomResponse(400, "Please provide all required fields");
  }

  if (user.role === UserRoleEnum.BOSS && !company?.name) {
    return CustomResponse(400, "Admin users must provide a Company name");
  }

  const existingUser = await userRepo.findOne({
    $or: [{ email: user.email }, { nickname: user.nickname }],
  });

  if (existingUser) {
    return CustomResponse(400, "User already exists");
  }

  let newUser: User = em.create(User, user);

  try {
    if (user.role === UserRoleEnum.BOSS) {
      const {
        newCompany,
        newUser: newAdminUser,
        newFirstForumMessage,
        newScheduleOptions,
      } = createAdminCompany(em, newUser, company);

      await em.persistAndFlush([
        newCompany,
        newFirstForumMessage,
        newScheduleOptions,
      ]);
      newUser = newAdminUser;
      const companyTk = jwt.sign(
        { id: newCompany.id },
        process.env.JWT_SECRET,
        {
          expiresIn: "30d",
        }
      );
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: "Confirma tu cuenta",
        html: companyVerificationEmailHtml(companyTk, company, newUser),
      });
    }
    const emailVerificationTk = jwt.sign(
      { id: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

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

    const refreshTokenString = crypto.randomBytes(64).toString("hex");
    const refreshToken = new RefreshToken(
      newUser,
      refreshTokenString,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    );

    await em.persistAndFlush(refreshToken);

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "rafaam.2002@gmail.com",
      subject: "Confirma tu cuenta",
      html: emailHtml(emailVerificationTk),
    });

    return CustomResponse(200, "User created successfully", true, {
      user: newUser,
      tokens: {
        token,
        refreshToken: refreshTokenString,
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

  if (
    currentUser.id !== userId &&
    currentUser.contextRole !== UserRoleEnum.BOSS
  ) {
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

  if (
    currentUser.id !== userId &&
    currentUser.contextRole !== UserRoleEnum.BOSS
  ) {
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
    updateUser.pictureUrl.name = picture;
    updateUser.pictureUrl.url = await getPresignedUrl(picture);
  }

  try {
    await em.persistAndFlush(updateUser);

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

  if (isFixed && currentUser.contextRole === UserRoleEnum.STANDARD)
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
      company: currentUser.activeCompanyId,
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
  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }

  if (
    currentUser.contextRole !== UserRoleEnum.BOSS &&
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
  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message: Message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }
  if (
    currentUser.contextRole === UserRoleEnum.COACH &&
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

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
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
        { role: UserRoleEnum.PREMIUM },
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

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
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

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
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
    currentUser.contextRole !== UserRoleEnum.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  await em.removeAndFlush(userWeight);

  return CustomResponse(200, "User weight removed successfully", true);
};

// ===== SUBSCRIPTION RESOLVERS =====
export const newMessage = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      const result =
        payload.newMessage.receiver?.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver?.isForumMessage;

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
    // getAdminSchedules,
    getNotifications,
    getConversation,
    sendEmailVerification,
    getAdminStats,
    getTrainingTasks,
    getUserWeights,
    getUsers,
  },
  Mutation: {
    setCompanyMe,
    createUser,
    updateUser,
    updateUserPicture,
    // removeUser,
    createMessage,
    fixMessage,
    unfixMessage,
    createTrainingTask,
    removeTrainingTask,
    addUserWeight,
    removeUserWeight,
  },
  Subscription: {
    fixedMessages,
    newMessage,
  },
};
