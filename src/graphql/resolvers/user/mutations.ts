import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Message } from "../../../entities/Message";
import { UserType } from "../../../types";
import { notAuthError, notCreatedError, notLoggedError } from "../errors";
import {
  PaymentType,
  ScheduleState,
  SubscriptionStatus,
  UserRol,
} from "../../../types/enums";
import { Schedule } from "../../../entities/Schedule";
import { ScheduleProgrammed } from "../../../entities/ScheduleProgrammed";
import { createdSuccess } from "../successes";
import { Poll } from "../../../entities/Poll";
import { PollVote } from "../../../entities/PollVote";
import { Plan } from "../../../entities/Plan";
import { Subscription } from "../../../entities/Subscription";
import { Card } from "../../../entities/Card";
import Stripe from "stripe";
import { Transaction } from "../../../entities/Transaction";
import { createDateWithTime } from "../../../utils/schedules";
import { PubSub } from "graphql-subscriptions";
import z from "zod";

const minErrorMsg = (n: number) => `Mínimo ${n} caracteres`;
const maxErrorMsg = (n: number) => `Máximo ${n} caracteres`;
const noSpacesErrorMsg = "No se permiten espacios";
const emailErrorMsg = "Email inválido";
const phoneNumberErrorMsg = "Solo se permiten caracteres numéricos";

const updateUserSchema = z.object({
  nickname: z
    .string()
    .min(3, minErrorMsg(3))
    .max(20, maxErrorMsg(20))
    .regex(/^\S*$/, noSpacesErrorMsg),
  email: z.string().email(emailErrorMsg),
  name: z.string().min(3, minErrorMsg(3)).max(20, maxErrorMsg(20)),
  surname: z.string().min(3, minErrorMsg(3)).max(20, maxErrorMsg(20)),
  phoneNumber: z
    .string()
    .min(9, minErrorMsg(9))
    .max(9, maxErrorMsg(9))
    .regex(/^\d+$/, phoneNumberErrorMsg), // Solo permite caracteres numéricos
});

const pubsub = new PubSub();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_CGGvfNiIPwLXiDwaOfZ3oX6Y"
  // {
  //   apiVersion: "2024-12-18.acacia",
  // }
);

export const exampleMutation = async () => {
  pubsub.publish("PROBE", {
    example: "Example mutation",
  });
  return "Example mutation";
};

export const createUser = async (
  _,
  {
    user,
  }: {
    user: any;
  },
  { em }: { em: EntityManager }
) => {
  const userRepo = em.getRepository(User);

  if (!user.email || !user.name || !user.surname || !user.password) {
    return {
      success: false,
      code: "400",
      message: "Please provide all required fields",
    };
  }

  const existingEmail = await userRepo.findOne({ email: user.email });

  if (existingEmail) {
    return {
      success: false,
      code: "400",
      message: "Email already exists",
    };
  }

  const existingNickName = await userRepo.findOne({
    nickname: user.nickname,
  });

  if (existingNickName) {
    return {
      success: false,
      code: "400",
      message: "Nickname already exists",
    };
  }
  const newUser = em.create(User, {
    ...user,
  });
  console.log("user", newUser.id);
  try {
    await em.persistAndFlush(newUser);
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      success: true,
      code: "200",
      message: "User created successfully",
      user: newUser,
      token,
    };
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Error creating user",
    };
  }
};

export const updateUser = async (
  _,
  {
    user: {
      name,
      email,
      surname,
      nickname,
      phoneNumber,
      profilePicture,
      isActive,
      isBlocked,
      rol,
    },
  }: {
    user: {
      name: string;
      email: string;
      surname: string;
      nickname: string;
      phoneNumber: string;
      profilePicture: string;
      isActive: boolean;
      isBlocked: boolean;
      rol: UserRol;
    };
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  const userRepo = em.getRepository(User);

  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
      user: null,
    };
  }
  let user = await userRepo.findOne({ id: currentUser.id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
      user: null,
    };
  }

  try {
    // Validar los datos de entrada
    updateUserSchema.parse(user);
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Validation error",
      user: null,
    };
  }

  const usersWithexistingEmail = await userRepo.find({ email });
  if (usersWithexistingEmail.length > 1) {
    return {
      success: false,
      code: "400",
      message: "Email already exists",
    };
  }

  const existingNickName = await userRepo.find({ nickname });

  if (existingNickName.length > 1) {
    return {
      success: false,
      code: "400",
      message: "Nickname already exists",
    };
  }
  user.name = name;
  user.email = email;
  user.surname = surname;
  user.nickname = nickname;
  user.phoneNumber = phoneNumber || user.phoneNumber;
  user.profilePicture = profilePicture || user.profilePicture;
  user.isActive = isActive || user.isActive;
  user.isBlocked = isBlocked || user.isBlocked;
  user.rol = rol || user.rol;

  try {
    await em.persistAndFlush(user);
    return {
      success: true,
      code: "200",
      message: "User updated successfully",
      user,
    };
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Error updating user",
      user: null,
    };
  }
};

export const resetPassword = async (
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

export const removeUser = async (
  parent,
  args,
  { em }: { em: EntityManager }
) => {
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

export const createMessage = async (
  root: any,
  {
    message: { text, receiverId, isFixed, fixedDuration = null },
  }: {
    message: {
      text: string;
      receiverId: string;
      isFixed: boolean;
      fixedDuration: number;
    };
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (isFixed === null) isFixed = false;
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
    return {
      success: true,
      code: "200",
      message: "Message sent successfully",
      sms: newMessage,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      code: "400",
      message: "Error sending message",
    };
  }
};

export const createSchedule = async (
  root: any,
  {
    schedule: { title, startDate, endDate, maxUsers, state },
  }: {
    schedule: {
      title: string;
      startDate: string;
      endDate: string;
      maxUsers: number;
      state: ScheduleState;
      isProgrammed: boolean;
    };
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (state === null) state = ScheduleState.AVAILABLE;
  let newStartDate = new Date(startDate);
  let newEndDate = new Date(endDate);

  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
    };
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return {
      success: false,
      code: "400",
      message: "You are not authorized to perform this action",
    };
  }
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });

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
    return {
      success: true,
      code: "200",
      message: "Schedule created successfully",
      schedule: newSchedule,
    };
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Error creating schedule",
    };
  }
};

export const addUserToSchedule = async (
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
  const userReference = em.getReference(User, currentUser.id);

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );
  console.log("schedule", schedule);
  if (!schedule) {
    return {
      success: false,
      code: "404",
      message: "Schedule not found",
    };
  }
  if (schedule.state !== ScheduleState.AVAILABLE) {
    return {
      success: false,
      code: "400",
      message: "Schedule is not available",
    };
  }
  if (schedule.users.contains(userReference)) {
    return {
      success: false,
      code: "400",
      message: "User already in schedule",
    };
  }
  schedule.users.add(userReference);
  await em.persistAndFlush(schedule);
  return {
    success: true,
    code: "200",
    message: "User added to schedule",
  };
};

export const removeUserFromSchedule = async (
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
  const userReference = em.getReference(User, currentUser.id);

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );
  if (!schedule) {
    return {
      success: false,
      code: "404",
      message: "Schedule not found",
    };
  }
  if (schedule.state !== ScheduleState.AVAILABLE) {
    return {
      success: false,
      code: "400",
      message: "Schedule is not available",
    };
  }
  if (!schedule.users.contains(userReference)) {
    return {
      success: false,
      code: "400",
      message: "User not in schedule",
    };
  }
  schedule.users.remove(userReference);
  await em.persistAndFlush(schedule);
  return {
    success: true,
    code: "200",
    message: "User removed from schedule",
  };
};

export const createScheduleDevelopment = async (
  root: any,
  {
    scheduleDevelopment: {
      title,
      startTime,
      endTime,
      maxUsers,
      state = ScheduleState.AVAILABLE,
    },
  }: {
    scheduleDevelopment: {
      title: string;
      startTime: string;
      endTime: string;
      maxUsers: number;
      state: ScheduleState;
      isProgrammed: boolean;
    };
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (state === null) state = ScheduleState.AVAILABLE;
  let newStartDate = createDateWithTime(startTime); // startTime es la cadena de tiempo pasada por parámetro, por ejemplo "11:30"
  let newEndDate = createDateWithTime(endTime); // endTime es la cadena de tiempo pasada por parámetro, por ejemplo "12:30"

  if (!currentUser) {
    return {
      success: false,
      code: "400",
      message: "Please login",
    };
  }
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });

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
    return {
      success: true,
      code: "200",
      message: "Schedule created successfully",
      schedule: newSchedule,
    };
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Error creating schedule",
    };
  }
};

export const createScheduleProgrammed = async (
  root: any,
  {
    scheduleProgrammed: { daysOfWeek = [], startHour, endHour, maxUsers },
  }: {
    scheduleProgrammed: {
      daysOfWeek: number[];
      startHour: string;
      endHour: string;
      maxUsers: number;
    };
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

export const createPoll = async (
  root: any,
  {
    poll: { title, options, durationDays },
  }: {
    poll: {
      title: string;
      options: string[];
      durationDays: number;
    };
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return notAuthError("You are not authorized to perform this action");
  }
  if (durationDays < 1) {
    return {
      success: false,
      code: "400",
      message: "Duration days must be greater than 0",
    };
  }
  options = options.filter((option) => option.trim() !== "");
  const userRepo = em.getRepository(User);
  const admin = await userRepo.findOne({ id: currentUser.id });
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  const newPoll = em.create(Poll, {
    endDate,
    title,
    options,
    admin: em.getReference(User, currentUser.id),
  });
  try {
    await em.persistAndFlush(newPoll);
    return {
      success: true,
      code: "200",
      message: "Poll created successfully",
      poll: newPoll,
    };
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Error creating poll",
    };
  }
};

export const createOrChangePollVote = async (
  root: any,
  {
    vote: { pollId, option },
  }: {
    vote: {
      pollId: string;
      option: number;
    };
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
  });
  try {
    newPollVote.optionSelected = option;

    await em.persistAndFlush(newPollVote);
  } catch (error) {
    return notCreatedError("Error creating vote");
  }
  return createdSuccess("Vote added succesfully", newPollVote, null);
};

export const deletePollVote = async (
  root: any,
  {
    pollId,
  }: {
    pollId: string;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return notLoggedError("Please login");
  }
  const pollVoteRepo = em.getRepository(PollVote);
  const pollVote = await pollVoteRepo.findOne({
    user: currentUser.id,
    poll: pollId,
  });
  if (!pollVote) {
    return {
      success: false,
      code: "404",
      message: "Vote not found",
    };
  }
  await em.removeAndFlush(pollVote);
  return {
    success: true,
    code: "200",
    message: "Vote removed succesfully",
  };
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
    return {
      success: false,
      code: "404",
      message: "Schedule not found",
    };
  }
  if (
    schedule.admin.id !== currentUser.id &&
    currentUser.rol !== UserRol.BOSS
  ) {
    return notAuthError("You are not authorized to perform this action");
  }
  schedule.state = ScheduleState.CANCELLED;
  await em.persistAndFlush(schedule);
  return {
    success: true,
    code: "200",
    message: "Schedule cancelled succesfully",
    schedule,
  };
};

export const createSubscription = async (
  _: any,
  args: any,
  {
    em,
    currentUser,
  }: {
    em: EntityManager;
    currentUser: User;
  }
) => {
  const { paymentMethod, cardId, planId, applePayToken, googlePayToken } =
    args.subscription;

  if (!currentUser) {
    return notLoggedError("Please login");
  }

  if (!planId) {
    return {
      success: false,
      code: "400",
      message: "Please provide a plan Id",
    };
  }

  if (!paymentMethod) {
    return {
      success: false,
      code: "400",
      message: "Please provide a payment method",
    };
  }

  const plan = await em.findOne(Plan, { id: planId });
  const user = await em.findOne(User, { id: currentUser.id });

  if (!plan) {
    return {
      success: false,
      code: "404",
      message: "Plan not found",
    };
  }

  if (!user) {
    return {
      success: false,
      code: "404",
      message: "User not found",
    };
  }

  const startDate = new Date();
  const endDate = new Date();

  endDate.setMonth(
    startDate.getMonth() + (plan.paymentType === PaymentType.MENSUAL ? 1 : 12)
  );

  const subscription = em.create(Subscription, {
    user,
    plan,
    status: SubscriptionStatus.PENDING,
    startDate,
    endDate,
  });

  await em.persistAndFlush(subscription);

  if (!subscription) {
    return {
      success: false,
      code: "404",
      message: "Subscription not found",
    };
  }

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return {
      success: false,
      code: "400",
      message: "Subscription already active",
    };
  }

  const paymentData = {
    em,
    paymentMethod,
    cardId,
    planId,
    subscription,
    applePayToken,
    googlePayToken,
  };

  addPayment(paymentData);

  return {
    success: true,
    code: "200",
    message: "Subscription added",
  };
};

export const removeSubscription = async (
  _: any,
  args: any,
  {
    em,
    currentUser,
  }: {
    em: EntityManager;
    currentUser: User;
  }
) => {
  const { planId } = args;

  if (!currentUser) {
    return notLoggedError("Please login");
  }

  if (!planId) {
    return {
      success: false,
      code: "400",
      message: "Please provide a plan Id",
    };
  }

  const plan = await em.findOne(Plan, { id: planId });
  const user = await em.findOne(User, { id: currentUser.id });

  if (!user) {
    return {
      success: false,
      code: "400",
      message: "User not found",
    };
  }
  if (!plan) {
    return {
      success: false,
      code: "400",
      message: "Plan not found",
    };
  }

  await em.remove(plan).flush();

  return {
    success: true,
    code: "200",
    message: "Subscription removed",
  };
};

export const addPayment = async (paymentData: any) => {
  const {
    em,
    paymentMethod,
    cardId,
    planId,
    subscription,
    applePayToken,
    googlePayToken,
    user,
  } = paymentData;

  const amount = subscription.plan.price * 100;
  const currency = subscription.plan.currency;

  let payment: Stripe.PaymentIntent;
  let reference: string = "";
  let authCode: string = "";
  let charge: Stripe.Charge;

  try {
    switch (paymentMethod) {
      case "CARD":
        if (!cardId) {
          return {
            success: false,
            code: "400",
            message: "Please provide a card Id",
          };
        }
        const card = await em.findOneOrFail(Card, { id: cardId });

        payment = await stripe.paymentIntents.create({
          amount,
          currency,
          payment_method: card.tokenization,
          confirm: true,
          description: `Pago de la suscripción ${subscription.plan.name}`,
        });

        charge = payment.latest_charge
          ? await stripe.charges.retrieve(payment.latest_charge as string)
          : null;

        reference = payment.client_secret || "";
        authCode = charge?.id || "";
        break;
      case "APPLE_PAY":
        if (!applePayToken) {
          return {
            success: false,
            code: "400",
            message: "Please provide a apple pay token",
          };
        }
        payment = await stripe.paymentIntents.create({
          amount,
          currency,
          payment_method: applePayToken,
          confirm: true,
          description: `Pago de suscripción al plan ${subscription.plan.name} (Apple Pay)`,
        });

        charge = payment.latest_charge
          ? await stripe.charges.retrieve(payment.latest_charge as string)
          : null;

        reference = payment.client_secret || "";
        authCode = charge?.id || "";
        break;
      case "GOOGLE_PAY":
        if (!googlePayToken) {
          return {
            success: false,
            code: "400",
            message: "Please provide a google pay token",
          };
        }

        // 🔐 Procesar pago con Google Pay
        payment = await stripe.paymentIntents.create({
          amount,
          currency,
          payment_method: googlePayToken,
          confirm: true,
          description: `Pago de suscripción al plan ${subscription.plan.name} (Google Pay)`,
        });

        charge = payment.latest_charge
          ? await stripe.charges.retrieve(payment.latest_charge as string)
          : null;

        reference = payment.client_secret || "";
        authCode = charge?.id || "";
        break;
      default:
        throw new Error("Método de pago no soportado.");
    }

    const transaccion = em.create(Transaction, {
      user,
      subscription,
      paymentMethod,
      amount: subscription.plan.price,
      currency,
      status: "SUCCESS",
      transactionId: payment.id,
      reference,
      transactionDate: new Date(),
      description: `Pago exitoso de suscripción al plan ${subscription.plan.name}`,
      authCode,
    });

    subscription.status = "ACTIVE";
    subscription.startDate = new Date();
    subscription.endDate = new Date(
      new Date().setMonth(
        new Date().getMonth() +
          (subscription.plan.paymentType === "MENSUAL" ? 1 : 12)
      )
    );

    await em.persistAndFlush([transaccion, subscription]);

    return `Pago exitoso. ID de transacción: ${payment.id}`;
  } catch (error: any) {
    const transaccion = em.create(Transaction, {
      user,
      subscription,
      paymentMethod,
      amount: subscription.plan.price,
      currency,
      status: "FAILED",
      transactionId: "",
      reference: "",
      transactionDate: new Date(),
      description: `Pago fallido de suscripción al plan ${subscription.plan.name}: ${error.message}`,
      authCode: "",
    });

    await em.persistAndFlush(transaccion);
    throw new Error(`Error al procesar el pago: ${error.message}`);
  }
};
