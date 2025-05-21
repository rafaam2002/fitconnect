import { User } from "../../../entities/User";
import jwt from "jsonwebtoken";
import { Message } from "../../../entities/Message";
import {
  CreditCardProvider,
  PaymentType,
  ScheduleState,
  SubscriptionStatus,
  UserRol,
} from "../../../types/enums";
import { Schedule } from "../../../entities/Schedule";
import { Poll } from "../../../entities/Poll";
import { PollVote } from "../../../entities/PollVote";
import { Plan } from "../../../entities/Plan";
import { Subscription } from "../../../entities/Subscription";
import { Card } from "../../../entities/Card";
import Stripe from "stripe";
import { Transaction } from "../../../entities/Transaction";
import {
  createDateWithTime,
  createScheduleProgrammed,
} from "../../../utils/schedules";
import { updateUserSchema } from "../../../validation/schemas";
import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from "../../../constants/subscriptions";
import moment from "moment";
import { CustomResponse } from "../errors";
import {
  AddUserWeight,
  ChangeScheduleStatusProp,
  ContextProps,
  CreateTrainingTaskProps,
  DeletePollProps,
  FixMessageProps,
  MessageProps,
  PollProps,
  RemoveScheduleProps,
  removeTrainingTaskProps,
  RemoveUserSheduleProps,
  RemoveUserWeight,
  ScheduleDevelopmentProps,
  ScheduleProps,
  UnfixMessageProps,
  UserPictureProps,
  UserProps,
  VoteProps,
} from "../../../types/resolvers";
import { TrainingTask } from "../../../entities/TraningITask";
import { UserWeight } from "../../../entities/UserWeight";
import { PictureUrl } from "../../../entities/PictureUrl";
import { get } from "axios";
import {
  createPictureUrl,
  getPresignedUrl,
} from "../../../utils/createPresignedUrls";

import nodemailer from "nodemailer";
import { emailHtml } from "../../../utils/emailHtml";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_CGGvfNiIPwLXiDwaOfZ3oX6Y"
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // tu email
    pass: process.env.GMAIL_APP_PASS, // password o app password
  },
});

type AddScheduleProps = { scheduleId: string };
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
        expiresIn: "1d",
      }
    );

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "rafaam.2002@gmail.com",
      subject: "Confirma tu cuenta",
      html: emailHtml(emailVerificationTk),
    });

    await em.persistAndFlush(newUser);

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
    rol,
  } = fields;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (currentUser.id !== userId && currentUser.rol !== UserRol.BOSS) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  let updateUser = await userRepo.findOne({ id: userId });

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
  updateUser.rol = rol || updateUser.rol;

  try {
    // Validar los datos de entrada
    updateUserSchema.parse(updateUser);
  } catch (error) {
    return CustomResponse(400, "Validation Error", false, { user: null });
  }

  const usersWithexistingEmail = await userRepo.find({ email });
  if (usersWithexistingEmail.length > 1) {
    return CustomResponse(400, "Email already exists");
  }

  const existingNickName = await userRepo.find({ nickname });

  if (existingNickName.length > 1) {
    return CustomResponse(400, "Nickname already exists");
  }

  try {
    await em.persistAndFlush(updateUser);

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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.id !== userId && currentUser.rol !== UserRol.BOSS) {
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
  const { text, receiverId, isFixed, fixedDuration = null } = message;

  if (!currentUser) return CustomResponse(401, "Please login");

  if (isFixed && currentUser.rol === UserRol.STANDARD)
    return CustomResponse(403, "You are not authorized to perform this action");

  if (isFixed && receiverId != process.env.DB_FORUM_ID)
    return CustomResponse(
      403,
      "You can only fix messages in the forum",
      false,
      { user: null }
    );

  const userRepo = em.getRepository(User);
  const receiver = await userRepo.findOne({ id: receiverId });

  try {
    const newMessage = em.create(Message, {
      text,
      receiver,
      sender: em.getReference(User, currentUser.id),
      isFixed: !!isFixed,
      fixedDuration,
    });
    await em.persistAndFlush(newMessage);

    myPubsub.publish(MESSAGE_EVENT, { newMessage });
    return CustomResponse(200, "Message created successfully", true, {
      sms: newMessage,
    });
  } catch (error) {
    console.error(error);
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
  const { title, description, startDate, endDate, maxUsers, repeatDays } =
    schedule;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const admin = em.getReference(User, currentUser.id);

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
        admin,
      },
      { em, currentUser }
    );
  } else {
    const newSchedule = em.create(Schedule, {
      title,
      description,
      startDate,
      endDate,
      maxUsers,
      state: ScheduleState.AVAILABLE,
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
    return CustomResponse(401, "Please login");
  }
  const userReference = em.getReference(User, currentUser.id);

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );
  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  if (schedule.state !== ScheduleState.AVAILABLE) {
    return CustomResponse(400, "Schedule is not available");
  }

  if (schedule.users.contains(userReference)) {
    return CustomResponse(400, "User already in schedule");
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
  _: any,
  args: RemoveUserSheduleProps,
  context: ContextProps
) => {
  const { scheduleId, userId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
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
      (currentUser.rol === UserRol.COACH && userId === schedule.admin.id) ||
      currentUser.rol === UserRol.BOSS
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
    schedule ,
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
    return CustomResponse(401, "Please login");
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

export const createPoll = async (
  _: any,
  args: PollProps,
  context: ContextProps
) => {
  const { poll } = args;
  const { title, endDate } = poll;
  let { options } = poll;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  options = options.filter((option) => option.trim() !== "");

  if (moment(endDate).isBefore(new Date())) {
    return CustomResponse(400, "End date must be in the future");
  }

  try {
    const newPoll = em.create(Poll, {
      endDate: moment(Number(endDate)).toDate(),
      title,
      options,
      admin: em.getReference(User, currentUser.id),
    });

    await em.persistAndFlush(newPoll);

    return CustomResponse(200, "Poll created successfully", true, {
      poll: newPoll,
    });
  } catch (error) {
    console.error(error);

    return CustomResponse(500, "Error creating poll");
  }
};

export const createOrChangePollVote = async (
  _: any,
  args: VoteProps,
  context: ContextProps
) => {
  const { vote } = args;
  const { pollId, option } = vote;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  const pollRepo = em.getRepository(Poll);

  const poll = await pollRepo.findOne({ id: pollId });

  if (!poll) {
    return CustomResponse(404, "Poll not found");
  }

  if (poll.endDate < new Date()) {
    return CustomResponse(403, "Poll has ended");
  }
  if (option < 0 || option >= poll.options.length) {
    return CustomResponse(400, "Invalid option");
  }
  const newPollVote = em.create(PollVote, {
    poll,
    user: em.getReference(User, currentUser.id),
  });

  try {
    newPollVote.optionSelected = option;

    await em.persistAndFlush(newPollVote);
  } catch (error) {
    return CustomResponse(500, "Error creating vote");
  }

  return CustomResponse(200, "Vote created successfully", true, {
    vote: newPollVote,
  });
};

export const deletePollVote = async (
  _: any,
  args: DeletePollProps,
  context: ContextProps
) => {
  const { pollId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  const pollVoteRepo = em.getRepository(PollVote);
  const pollVote = await pollVoteRepo.findOne({
    user: currentUser.id,
    poll: pollId,
  });

  if (!pollVote) {
    return CustomResponse(404, "Poll Vote not found");
  }

  await em.removeAndFlush(pollVote);

  return CustomResponse(200, "Poll Vote deleted successfully", true);
};

export const fixMessage = async (
  _: any,
  args: FixMessageProps,
  context: ContextProps
) => {
  const { messageId, fixedEndDate } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }

  if (
    currentUser.rol !== UserRol.BOSS &&
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
    return CustomResponse(401, "Please login");
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const messageRepo = em.getRepository(Message);
  const message: Message = await messageRepo.findOne({ id: messageId });

  if (!message) {
    return CustomResponse(404, "Message not found");
  }
  if (
    currentUser.rol === UserRol.COACH &&
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
    return CustomResponse(401, "Please login");
  }
  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne(
    { id: scheduleId },
    { populate: ["users"] }
  );

  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  if (
    schedule.admin.id !== currentUser.id &&
    currentUser.rol !== UserRol.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }
  if (schedule.state === ScheduleState.AVAILABLE) {
    schedule.state = ScheduleState.CANCELLED;
  } else {
    if (schedule.users.length === schedule.maxUsers)
      schedule.state = ScheduleState.FULL;
    else schedule.state = ScheduleState.AVAILABLE;
  }

  await em.persistAndFlush(schedule);

  return CustomResponse(200, "Schedule status changed successfully", true, {
    schedule,
  });
};

export const createSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { paymentMethod, cardId, planId, applePayToken, googlePayToken } =
    args.subscription;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (!planId) {
    CustomResponse(400, "Please provide a plan Id");
  }

  if (!paymentMethod) {
    return CustomResponse(400, "Please provide a payment method");
  }

  const plan = await em.findOne(Plan, { id: planId });
  const user = em.getReference(User, currentUser.id);

  if (!plan) {
    return CustomResponse(404, "Plan not found");
  }

  if (!user) {
    return CustomResponse(404, "User not found");
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
    return CustomResponse(404, "Subscription not found");
  }

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return CustomResponse(400, "User already has an active subscription");
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

  await addTransaction(paymentData);

  return CustomResponse(200, "Subscription created successfully", true);
};

export const removeSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { planId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (!planId) {
    return CustomResponse(400, "Please provide a plan Id");
  }

  const plan = await em.findOne(Plan, { id: planId });
  const user = em.getReference(User, currentUser.id);

  if (!user) {
    return CustomResponse(404, "User not found");
  }
  if (!plan) {
    return CustomResponse(404, "Plan not found");
  }

  await em.remove(plan).flush();

  return CustomResponse(200, "Plan deleted successfully", true);
};

export const addTransaction = async (paymentData: any) => {
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

export const addCreditCard = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { paymentMethodId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (!paymentMethodId) {
    return CustomResponse(400, "Please provide a payment method Id");
  }

  let stripeCustomerId = currentUser.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: currentUser.email,
      name: currentUser.name,
    });
    stripeCustomerId = customer.id;
    currentUser.stripeCustomerId = stripeCustomerId;

    await em.persistAndFlush(currentUser);
  }

  // Asociar el método de pago al cliente en Stripe
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });

  // Opcional: Actualizar el método de pago predeterminado para facturación
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Guardar la tarjeta en la base de datos
  const card = em.create(Card, {
    user: currentUser,
    tokenization: paymentMethodId,
    provider: CreditCardProvider.STRIPE,
    // Agrega aquí cualquier otro campo necesario para el modelo de Tarjeta
  });
  await em.persistAndFlush(card);

  return `Tarjeta agregada exitosamente para el usuario ${currentUser.name}`;
};

export const createTrainingTask = async (
  _: any,
  args: CreateTrainingTaskProps,
  context: ContextProps
) => {
  const { content, userId, date, repeat = false } = args.trainingTask;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
    return CustomResponse(401, "Please login");
  }

  if (currentUser.rol === UserRol.STANDARD) {
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
    return CustomResponse(401, "Please login");
  }

  const userWeightRepo = em.getRepository(UserWeight);
  const userWeight = await userWeightRepo.findOne({ id: userWeightId });

  if (!userWeight) {
    return CustomResponse(404, "User weight not found");
  }
  if (
    userWeight.user.id !== currentUser.id &&
    currentUser.rol !== UserRol.BOSS
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
    return CustomResponse(401, "Please login");
  }

  const scheduleRepo = em.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne({ id: scheduleId });

  if (!schedule) {
    return CustomResponse(404, "Schedule not found");
  }

  if (
    schedule.admin.id !== currentUser.id &&
    currentUser.rol !== UserRol.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  await em.removeAndFlush(schedule);

  return CustomResponse(200, "Schedule removed successfully", true);
};
