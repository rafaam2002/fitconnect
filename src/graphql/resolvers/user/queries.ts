import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import { UserRol } from "../../../types/enums";
import { Poll } from "../../../entities/Poll";
import { UserType } from "../../../types";
import { Message } from "../../../entities/Message";
import { notLoggedError } from "../errors";
import { PollVote } from "../../../entities/PollVote";
import { Schedule } from "../../../entities/Schedule";
import { ScheduleOptions } from "../../../entities/ScheduleOptions";

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
  { scheduleId }: { scheduleId: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    return notLoggedError("Please login");
  }
  // if (currentUser.endSubscriptionDate < new Date()) {
  //     return {
  //         success: false,
  //         code: "400",
  //         message: "Your subscription has expired, please renew it",
  //     };
  // }
  if (scheduleId) {
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ["admin"] }
    );
    if (!schedule) {
      return {
        success: false,
        code: "404",
        message: "Schedule not found",
      };
    } else {
      return {
        success: true,
        code: "200",
        message: "Schedule found",
        schedule,
      };
    }
  }
  const schedules = await scheduleRepo.findAll({ populate: ["admin", "users"] });
  console.log(schedules[0].startDate);
  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedules: schedules,
  };
};

export const getSchedulesResume = async ( 
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const schedules = await scheduleRepo.findAll({ populate: ["users"] });
  const schedulesResume = schedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      isCancelled: schedule.isCancelled,
      ocupacy: schedule.users.length,
    };
  });

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedulesResume,
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
  args: any,
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
  if (user.notifications.length === 0) {
    return {
      success: false,
      code: "404",
      message: "Notifications not found",
    };
  }
  return {
    success: true,
    code: "200",
    message: "Notifications found",
    notifications: user.notifications,
  };
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
  { pollId }: { pollId: string },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  /* if (currentUser.endSubscriptionDate < new Date()) {
        return {
            success: false,
            code: "400",
            message: "Your subscription has expired, please renew it",
        };
    }*/

  const pollRepo = em.getRepository(Poll);
  const pollVotesRepo = em.getRepository(PollVote);

  if (pollId) {
    const poll = await pollRepo.findOne({ id: pollId });
    if (!poll) {
      return {
        success: false,
        code: "404",
        message: "Poll not found",
      };
    }
    return {
      success: true,
      code: "200",
      message: "Poll found",
      poll,
    };
  }

  const polls = await pollRepo.findAll({ populate: ["admin"] });

  if (polls.length === 0) {
    return {
      success: false,
      code: "404",
      message: "Polls not found",
    };
  }

  return {
    success: true,
    code: "200",
    message: "Polls found",
    polls,
  };

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

const getTodaySchedulesResume = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const todaySchedules = await scheduleRepo.find({
    startDate: { $gte: startOfDay, $lte: endOfDay }
  }, { populate: ["users"] });

  const schedulesResume = todaySchedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      isCancelled: schedule.isCancelled,
      ocupacy: schedule.users.length,
    };
  });

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedulesResume,
  };
};

const getScheduleOptions = async (
  root: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const scheduleOptionRepo = em.getRepository(ScheduleOptions);
  const scheduleOptions = await scheduleOptionRepo.findAll();
  if (scheduleOptions.length === 0) {
    return {
      success: false,
      code: "404",
      message: "Schedule options not found",
    };
  }
  return {
    success: true,
    code: "200",
    message: "Schedule options found",
    scheduleOptions: scheduleOptions[0],
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
  getScheduleOptions,
  getTodaySchedulesResume,
};
