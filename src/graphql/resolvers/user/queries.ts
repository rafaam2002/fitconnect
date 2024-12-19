import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import { UserRol } from "../../../types/enums";
import { Poll } from "../../../entities/Poll";
import { UserType } from "../../../types";
import { Message } from "../../../entities/Message";
import { notLoggedError } from "../errors";
import { PollVote } from "../../../entities/PollVote";
import { Console } from "node:console";
import { Schedule } from "../../../entities/Schedule";

const allUsers = async (
  root: any,
  arg: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const userRepo = em.getRepository(User);
  const users = await userRepo.findAll();

  return {
    success: true,
    code: "200",
    message: "Users found",
    users: users,
  };
};

const me = async (
  root: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  //falta conseguir el usuario actual
  const me = await userRepo.findOne({ id: currentUser.id });
  if (me) {
    return {
      success: true,
      code: "200",
      message: "User found",
      user: me,
    };
  } else {
    return {
      success: false,
      code: "404",
      message: "User not logged",
      user: null,
    };
  }
};

const findUser = async (
  _,
  args: { id: string },
  { em }: { em: EntityManager }
) => {
  const userRepo = em.getRepository(User);

  const { id } = args;
  const user = await userRepo.findOne({ id });

  if (!user) {
    return {
      success: false,
      code: "404",
      message: "User not found",
      user: null,
    };
  }
  return {
    success: true,
    code: 200,
    message: "User found",
    user,
  };
};

const getPromotions = async (
  _: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["promotions"] }
  );
  return user.promotions;
};

const getSchedules = async (
  _: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.endSubscriptionDate < new Date()) {
    return {
      success: false,
      code: "400",
      message: "Your subscription has expired, please renew it",
    };
  }
  const schedules = await scheduleRepo.find(
    { admin: currentUser.id },
  );
  console.log(schedules);
  console.log();
  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedules: schedules,
  };
};

const getAdminSchedules = async (
  root: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
    };
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["adminSchedules"] }
  );
  return user.adminSchedules;
};

const getNotifications = async (
  root: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["notifications"] }
  );
  return user.notifications;
};

const getAdminPolls = async (
  root: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
    };
  }
  const user = await userRepo.findOne(
    { id: currentUser.id },
    { populate: ["adminPolls"] }
  );
  return user.adminPolls;
};

const getPolls = async (
  root: any,
  args: { id: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.endSubscriptionDate < new Date()) {
    return {
      success: false,
      code: "400",
      message: "Your subscription has expired, please renew it",
    };
  }

  const pollRepo = em.getRepository(Poll);
  const pollVotesRepo = em.getRepository(PollVote);

  const polls = await pollRepo.findAll();
  const userVotes = await pollVotesRepo.find({ user: currentUser.id });

  return {
    success: true,
    code: "200",
    message: "Polls found",
    polls,
    userVotes,
  };

  // if (!currentUser) {
  //   return {
  //     success: false,
  //     code: "400",
  //     message: "User not logged",
  //   };
  // }
  // const {pollOptionSelections} = await userRepo.findOne(
  //   { id: currentUser.id },
  //   { populate: ["pollOptionSelections"] }
  // );
};

const getConversation = async (
  root: any,
  {
    otherUserId = process.env.DB_FORUM_ID,
    page = 0,
  }: { otherUserId: string; page: number },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const messageRepo = em.getRepository(Message);
  let forumFields = [];
  if (otherUserId === process.env.DB_FORUM_ID) {
    //forum
    forumFields = ["isFixed", "fixedDuration"]; //this fields are only available in forum
  }
  const messages = await messageRepo.find(
    {
      $or: [
        { sender: currentUser.id, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUser.id },
      ],
    },
    {
      orderBy: { created_at: "ASC" },
      limit: 50,
      offset: page,
      fields: [
        "id",
        "sender",
        "receiver",
        "text",
        "created_at",
        ...forumFields,
      ], //just mandatory fields to optimize query
    }
  );
  return {
    success: true,
    code: "200",
    message: "Messages found",
    messages,
  };
};

export {
  getConversation,
  allUsers,
  me,
  findUser,
  getSchedules,
  getPromotions,
  getAdminSchedules,
  getNotifications,
  getAdminPolls,
  getPolls,
};
