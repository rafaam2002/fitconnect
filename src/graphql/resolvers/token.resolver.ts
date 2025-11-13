import { ContextProps, NotificationProps } from "../../types/resolvers";
import { CustomResponse } from "./errors";
import { PushToken } from "../../entities/PushToken";
import { sendPushNotification } from "../../utils/notifications";
import { GraphQLError } from "graphql";
import {getProducts} from "./product.resolver";
import {RefreshToken} from "../../entities/RefreshToken";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ===== QUERY RESOLVERS =====
export const refreshToken = async (_: any, args: any, { em }) => {
  debugger;
    const { refreshToken } = args;

    if (!refreshToken) {
        return {
            success: false,
            code: "400",
            message: "Refresh token is required",
        };
    }

    const storedRefreshToken = await em.findOne(
        RefreshToken,
        { token: refreshToken },
        { populate: ["user"] }
    );

    if (!storedRefreshToken) {
        return {
            success: false,
            code: "401",
            message: "Invalid refresh token",
        };
    }

    if (storedRefreshToken.expiresAt < new Date()) {
        await em.removeAndFlush(storedRefreshToken);
        return {
            success: false,
            code: "401",
            message: "Refresh token expired",
        };
    }

    const user = storedRefreshToken.user;
    const userForToken = {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        isBlocked: user.isBlocked,
        isActive: user.isActive,
        role: user.role,
        nickname: user.nickname,
        phoneNumber: user.phoneNumber,
        pictureUrl: user.pictureUrl,
    };

    const token = jwt.sign(userForToken, process.env.JWT_SECRET, {
        expiresIn: "30m",
    });

    const newRefreshTokenString = crypto.randomBytes(64).toString("hex");
    storedRefreshToken.token = newRefreshTokenString;
    storedRefreshToken.expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days

    await em.flush();

    return {
        success: true,
        code: "200",
        message: "Token refreshed successfully",
        tokens: {
            token,
            refreshToken: newRefreshTokenString,
        },
    };
};

// ===== MUTATION RESOLVERS =====
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

export const pushTokenResolvers = {
    Query: {
        // refreshToken,
    },
    Mutation: {
        registerToken,
        sendNotification,
        removePushToken
    }
}