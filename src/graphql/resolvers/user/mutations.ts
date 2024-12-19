import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Message } from "../../../entities/Message";
import { UserType } from "../../../types";
import { notCreatedError, notLoggedError, notAuthError } from "../errors";
import { UserRol } from "../../../types/enums";
import { Schedule } from "../../../entities/Schedule";
import { ScheduleProgrammed } from "../../../entities/ScheduleProgrammed";
import { createdSuccess, userAuthSuccess } from "../successes";
import { create } from "domain";
import { Poll } from "../../../entities/Poll";
import { start } from "repl";
import { PollVote } from "../../../entities/PollVote";

export const createUser = async (_, args, { em }: { em: EntityManager }) => {
  const user = em.getRepository(User);

  const { name, email, password, surname, nickname } = args.user as User;

  if (!email || !name || !surname || !password) {
    return notCreatedError("Please provide all required fields");
  }

  const existingEmail = await user.findOne({ email });

  if (existingEmail) {
    return notCreatedError("Email already exists");
  }

  const existingNickName = await user.findOne({ nickname });

  if (existingNickName) {
    return notCreatedError("Nickname already exists");
  }
  const newUser = em.create(User, {
    ...args.user,
  });
  console.log("user", newUser.id);
  await em.persistAndFlush(newUser);

  if (!newUser.id) return notCreatedError("User not created, please try again");

  const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return createdSuccess("User created succesfully", newUser, token);
};

const updateUser = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: any }
) => {
  const { input } = args;
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.role !== "ADMIN") {
    return notAuthError("You are not authorized to perform this action");
  }

  if (!input || !input.id) {
    return {
      success: false,
      code: "400",
      message: "Invalid input",
      user: null,
    };
  }

  const user: any = await em.find(User, { id: input.id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
      user: null,
    };
  }

  if (user.rol === "boss") {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
      user: null,
    };
  }

  delete input.id;

  const updatedUser = await em.find(User, { id: user.id }, { ...input });
  //console.log(updatedUser)
  if (!updatedUser) {
    return {
      success: false,
      code: "400",
      message: "User not updated",
      user: null,
    };
  }
  return {
    success: true,
    code: "200",
    message: "User updated successfully",
    user: updatedUser,
  };
};

const resetPassword = async (
  _: any,
  args: any,
  { em, currentUser }: { em: EntityManager; currentUser: any }
) => {
  const { id, password } = args.input;
  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
      user: null,
    };
  }
  if (currentUser.role !== "ADMIN") {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
      user: null,
    };
  }

  if (!password || !id) {
    return {
      success: false,
      code: "400",
      message: "Invalid input",
      user: null,
    };
  }

  const user = await em.findOne(User, { id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
      user: null,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  Object.assign(user, {
    password: passwordHash,
  });

  await em.flush();

  /* if (!updatedUser) {
       return {
         success: false,
         code: '400',
         message: 'User not updated',
         user: null
       }
     }*/

  return {
    success: true,
    code: "200",
    message: "User updated successfully",
    user: user,
  };
};

const removeUser = async (parent, args, { em }: { em: EntityManager }) => {
  const { id } = args;
  if (!id) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
      user: null,
    };
  }
  const user = em.getReference(User, id);
  if (!user) {
    return {
      success: false,
      code: "404",
      message: "User not found",
      user: null,
    };
  }

  await em.removeAndFlush(user);

  return user;
};

export const addMessage = async (
  root: any,
  {
    text,
    receiverId,
    isFixed = false,
    fixedDuration = 0,
  }: {
    text: string;
    receiverId: string;
    isFixed: boolean;
    fixedDuration: number;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) return notLoggedError("Please login");
  if (isFixed && currentUser.rol === UserRol.STANDARD)
    return notAuthError("You are not authorized to fix a message");
  if (isFixed && receiverId != process.env.DB_FORUM_ID)
    return notCreatedError("you can only fix messages in the forum");
  const userRepo = em.getRepository(User);
  const sender = await userRepo.findOne({ id: currentUser.id });
  const receiver = await userRepo.findOne({ id: receiverId });
  try {
    const newMessage = em.create(Message, {
      text,
      receiver,
      sender,
      isFixed,
      fixedDuration,
    });
    await em.persistAndFlush(newMessage);
    return createdSuccess("Message sent succesfully", newMessage, null);
  } catch (error) {
    console.error(error);
    return notCreatedError("Message not sent, please try again");
  }
};

export const addSchedule = async (
  root: any,
  {
    startDate,
    endDate,
    maxUsers,
    isCancelled = false,
  }: {
    startDate: Date;
    endDate: Date;
    maxUsers: number;
    isCancelled: boolean;
    isProgrammed: boolean;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });

  const newSchedule = em.create(Schedule, {
    startDate,
    endDate,
    maxUsers,
    isCancelled,
    admin,
  });
  await em.persistAndFlush(newSchedule);
  newSchedule.id
    ? createdSuccess("Schedule created succesfully", newSchedule, null)
    : notCreatedError("Schedule not created, please try again");
};

export const addScheduleProgrammed = async (
  root: any,
  {
    daysOfWeek = [],
    startHour,
    endHour,
    maxUsers,
  }: {
    daysOfWeek: number[];
    startHour: string;
    endHour: string;
    maxUsers: number;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });
  const newScheduleProgrammed = em.create(ScheduleProgrammed, {
    daysOfWeek,
    startHour,
    endHour,
    maxUsers,
    admin,
  });
  newScheduleProgrammed.createInitialSchedules(em);
  await em.persistAndFlush(newScheduleProgrammed);

  newScheduleProgrammed.id
    ? createdSuccess(
        "Schedule created succesfully",
        newScheduleProgrammed,
        null
      )
    : notCreatedError("Schedule not created, please try again");
};

export const addPoll = async (
  root: any,
  {
    title,
    options,
    durationDays,
  }: {
    title: string;
    options: string[];
    durationDays: number;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  const newPoll = em.create(Poll, {
    startDate,
    endDate,
    title,
    options,
    admin: em.getReference(User, currentUser.id),
  });
  await em.persistAndFlush(newPoll);

  newPoll.id
    ? createdSuccess("Poll created succesfully", newPoll, null)
    : notCreatedError("Poll not created, please try again");
};

export const addVote = async (
  root: any,
  {
    pollId,
    option,
  }: {
    pollId: string;
    option: number;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const pollRepo = em.getRepository(Poll);
  const poll = await pollRepo.findOne({ id: pollId });
  if (!poll) {
    return notCreatedError("Poll not found");
  }
  if (poll.endDate < new Date()) {
    return notCreatedError("Poll is closed");
  }
  if (option < 0 || option >= poll.options.length) {
    return notCreatedError("Option not valid");
  }
  const newPollVote = em.create(PollVote, {
    poll,
    user: em.getReference(User, currentUser.id),
    optionSelected: option,
  });
  await em.persistAndFlush(newPollVote);
  return createdSuccess("Vote added succesfully", newPollVote, null);
};

export const fixMessage = async (
  root: any,
  {
    messageId,
    duration,
  }: {
    messageId: string;
    duration: number;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  const messageRepo = em.getRepository(Message);
  const message = await messageRepo.findOne({ id: messageId });
  if (!message) {
    return notCreatedError("Message not found");
  }
  if (message.sender.id !== currentUser.id) {
    return notAuthError("You are not authorized to perform this action");
  }
  message.isFixed = true;
  message.fixedDuration = duration;
  await em.persistAndFlush(message);
  return createdSuccess("Message fixed succesfully", message, null);
};

export const unfixMessage = async (
  root: any,
  {
    messageId,
  }: {
    messageId: string;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  const messageRepo = em.getRepository(Message);
  const message = await messageRepo.findOne({ id: messageId });
  if (!message) {
    return notCreatedError("Message not found");
  }
  if (message.sender.id !== currentUser.id) {
    return notAuthError("You are not authorized to perform this action");
  }
  message.isFixed = false;
  message.fixedDuration = 0;
  await em.persistAndFlush(message);
  return createdSuccess("Message unfixed succesfully", message, null);
};

export const cancelSchedule = async (
  root: any,
  {
    scheduleId,
  }: {
    scheduleId: string;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne({ id: scheduleId });
  if (!schedule) {
    return notCreatedError("Schedule not found");
  }
  if (schedule.admin.id !== currentUser.id) {
    return notAuthError("You are not authorized to perform this action");
  }
  schedule.isCancelled = true;
  await em.persistAndFlush(schedule);
  return createdSuccess("Schedule cancelled succesfully", schedule, null);
};
