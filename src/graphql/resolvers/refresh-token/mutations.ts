import {ContextProps, NotificationProps} from "../../../types/resolvers";
import {CustomResponse} from "../errors";
import {PushToken} from "../../../entities/PushToken";
import {sendPushNotification} from "../../../utils/notifications";
import { RefreshToken } from "../../../entities/RefreshToken";
import jwt from "jsonwebtoken";
import { User } from "../../../entities/User";
import crypto from "crypto";

export const refreshToken = async (_: any, args: any, { em }) => {
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

