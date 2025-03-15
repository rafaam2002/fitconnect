import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "../../../entities/User";
import { UserRol } from "../../../types/enums";
import { Poll } from "../../../entities/Poll";
import { UserType } from "../../../types";
import { Message } from "../../../entities/Message";
import { notLoggedError } from "../errors";
import { PollVote } from "../../../entities/PollVote";
import { Schedule } from "../../../entities/Schedule";
import { ScheduleOptions } from "../../../entities/ScheduleOptions";
import moment from "moment";
import { UserFilter } from "../../../types/user";

export const getUsers = async (
  root: any,
  {
    filters,
    and_or,
  }: {
      filters: UserFilter[];
      and_or: 'and' | 'or';
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }

  const userRepo = em.getRepository(User);
  if (filters) {
      const users = await userRepo.find({
          [`$${and_or}`]: filters
    });
    return {
      success: true,
      code: "200",
      message: "Users found",
      users: users,
    };
  } else if (currentUser.rol === UserRol.BOSS) {
    const users = await userRepo.findAll();
    return {
      success: true,
      code: "200",
      message: "Users found",
      users: users,
    };
  } else {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
    };
  }
};

export const me = async (
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

export const findUser = async (
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

export const getPromotions = async (
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

export const getSchedules = async (
  _: any,
  {
    scheduleId,
    calculateIsBooked,
  }: { scheduleId: string; calculateIsBooked: boolean },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);

  if (!currentUser) {
    return notLoggedError("Please login");
  }

  if (scheduleId) {
    const schedule = await scheduleRepo.findOne(
      { id: scheduleId },
      { populate: ["admin", "users"] }
    );
    if (!schedule) {
      return {
        success: false,
        code: "404",
        message: "Schedule not found",
      };
    } else {
      if (calculateIsBooked) {
        const isBooked = schedule.users
          .getItems()
          .some((user) => user.id === currentUser.id);
        return {
          success: true,
          code: "200",
          message: "Schedule found",
          schedule: { ...schedule, isBooked },
        };
      }
      return {
        success: true,
        code: "200",
        message: "Schedule found",
        schedule,
      };
    }
  }
  const schedules = await scheduleRepo.findAll({
    populate: ["admin", "users"],
  });
  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedules: schedules,
  };
};

export const getSchedulesFromToday = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
    };
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay },
    },
    { populate: ["users"] }
  );

  if (schedules.length === 0) {
    return {
      success: false,
      code: "404",
      message: "Schedules not found",
    };
  }

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedules,
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

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedulesResume,
  };
};

export const getAdminSchedules = async (
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

export const getNotifications = async (
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

export const getAdminPolls = async (
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

export const getPolls = async (
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

export const getConversation = async (
  root: any,
  { otherUserId = null, page = 0 }: { otherUserId: string; page: number },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const messageRepo = em.getRepository(Message);
  let filter;
  let forumFields = [];
  if (otherUserId === process.env.DB_FORUM_ID) {
    //forum
    forumFields = ["isFixed", "fixedDuration"]; //this fields are only available in forum
  }
  otherUserId
    ? (filter = {
        $or: [
          { sender: currentUser.id, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUser.id },
        ],
      })
    : (filter = {
        $or: [{ sender: currentUser.id }, { receiver: currentUser.id }],
      });

  const messages = await messageRepo.find(filter, {
    orderBy: { created_at: "ASC" },
    limit: 50,
    offset: page,
    populate: ["sender", "receiver"],
    fields: [
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
    ], //just mandatory fields to optimize query
  });
  // Agrupar mensajes por otro usuario
  const conversationsMap = messages.reduce((acc, message) => {
    const otherUser =
      message.sender.id === currentUser.id
        ? message.receiver.id
        : message.sender.id;

    (acc[otherUser] ||= []).push(message); // Sintaxis optimizada para evitar chequeos extra
    return acc;
  }, {});

  // Convertir a array de arrays
  const conversations = Object.values(conversationsMap);

  return {
    success: true,
    code: "200",
    message: "Messages found",
    conversations,
  };
};

export const getTodaySchedulesResume = async (
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

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedulesResume,
  };
};

export const getSchedulesRange = async (
  _: any,
  {
    startDate,
    endDate,
    calculateIsBooked,
  }: {
    startDate: string;
    endDate: string;
    calculateIsBooked: boolean;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
    };
  }

  const startOfDay = moment(startDate).format("YYYY/MM/DD HH:mm:ss");
  const endOfDay = moment(endDate).format("YYYY/MM/DD HH:mm:ss");

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay, $lte: endOfDay },
    },
    { populate: ["users", "admin"] }
  );

  schedules.map((schedule) => {
    schedule.startDate = moment(
      new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
    ).toDate();

    schedule.endDate = moment(
      new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
    ).toDate();
  });

  if (calculateIsBooked) {
    const schedulesIsBooked = schedules.map((schedule) => {
      const isBooked = schedule.users
        .getItems()
        .some((user) => user.id === currentUser.id);
      return { ...schedule, isBooked };
    });

    return {
      success: true,
      code: "200",
      message: "Schedules found",
      schedules: schedulesIsBooked,
    };
  }

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedules,
  };
};

export const getSchedulesResumeRange = async (
  _: any,
  {
    startDate,
    endDate,
    calculateIsBooked,
  }: {
    startDate: string;
    endDate: string;
    calculateIsBooked: boolean;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const scheduleRepo = em.getRepository(Schedule);
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
    };
  }

  const startOfDay = new Date(startDate);
  const endOfDay = new Date(endDate);

  const schedules = await scheduleRepo.find(
    {
      startDate: { $gte: startOfDay, $lte: endOfDay },
    },
    { populate: ["users", "admin"] }
  );

  schedules.map((schedule) => {
    schedule.startDate = moment(
      new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
    ).toDate();

    schedule.endDate = moment(
      new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
    ).toDate();

    return schedule;
  });

  if (calculateIsBooked) {
    const schedulesResumeIsBooked = schedules.map((schedule) => {
      const isBooked = schedule.users
        .getItems()
        .some((user) => user.id === currentUser.id);
      return {
        id: schedule.id,
        startDate: schedule.startDate,
        maxUsers: schedule.maxUsers,
        state: schedule.state,
        ocupancy: schedule.users.length,
        isBooked,
      };
    });

    return {
      success: true,
      code: "200",
      message: "Schedules found",
      schedulesResume: schedulesResumeIsBooked,
    };
  }

  const schedulesResume = schedules.map((schedule) => {
    return {
      id: schedule.id,
      startDate: schedule.startDate,
      maxUsers: schedule.maxUsers,
      state: schedule.state,
      ocupancy: schedule.users.length,
    };
  });

  return {
    success: true,
    code: "200",
    message: "Schedules found",
    schedulesResume,
  };
};

export const getScheduleOptions = async (
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

export const getAdminStats = async (
  root: any,
  arg: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol !== UserRol.BOSS) {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
    };
  }
  const userRepo = em.getRepository(User);
  const knex = em.getKnex();

  const result = await knex("user as u").select([
    knex.raw("COUNT(u.id) as totalUsers"),
    knex.raw("COUNT(CASE WHEN u.is_active = true THEN 1 END) as activeUsers"),
    knex.raw("COUNT(CASE WHEN u.is_blocked = true THEN 1 END) as blockedUsers"),
    knex.raw(
      "COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactiveUsers"
    ),
  ]);
  const users = await userRepo.findAll();

  console.log(result[0]);
  const stats = {
    users: result[0],
    schedules: 0,
    polls: 0,
    plans: 0,
    subscriptions: 0,
    transactions: 0,
    notifications: 0,
  };
  return {
    success: true,
    code: "200",
    message: "Users found",
    stats: stats,
  };
};
