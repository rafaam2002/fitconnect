import { ContextProps, NotificationProps } from "../../../types/resolvers";
import { CustomResponse } from "../errors";
import { PushToken } from "../../../entities/PushToken";
import { sendPushNotification } from "../../../utils/notifications";
import { GraphQLError } from "graphql";


export const registerToken = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { token } = args;
  const { em, currentUser } = context;

if (!currentUser) {
        throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const existing = await em.findOne(PushToken, { token });

  if (!existing) {
    const newToken = em.create(PushToken, { token, user: currentUser });
    await em.persistAndFlush(newToken);
  }

  await em.flush();

  return CustomResponse(201, "The token has been registered.", true);
};

export const sendNotification = async (
  _: any,
  args: NotificationProps,
  context: ContextProps
) => {
  const { notification } = args;
  const { body, title, forAll } = notification;
  const { em, currentUser } = context;

  if (!currentUser) {
    return CustomResponse(404, "Not logged in");
  }
  let tokens;
  if (forAll) {
    tokens = await em.findAll(PushToken);
  } else tokens = await em.find(PushToken, { user: currentUser.id });

  if (!tokens.length) return CustomResponse(401, "No tokens found.");

  for (const token of tokens) {
    await sendPushNotification(token.token, title, body);
  }

  return CustomResponse(201, "The message has been set.", true);
};


export const removePushToken = async (
  _: any,
  { token }: { token: string },
  { em, currentUser }: ContextProps
) => {
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const pushTokenRepo = em.getRepository(PushToken);
  const pushToken = await pushTokenRepo.findOne({ token, user: currentUser });

  if (!pushToken) {
    return CustomResponse(404, "Push token not found for the current user.", false);
  }

  try {
    await em.removeAndFlush(pushToken);
    return CustomResponse(200, "Push token removed successfully.", true);
  } catch (error) {
    console.error("Error removing push token:", error);
    return CustomResponse(500, "Error removing push token.", false);
  }
};