import { EntityManager } from "@mikro-orm/core";
import { User } from "../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ChangePasswordSchema } from "../../validation/schemas";
import { generateTempPassword, verifyGoogleToken } from "../../utils/users";
import { UserProviderType } from "../../types/enums";
import nodemailer from "nodemailer";
import { changePasswordHtml } from "../../utils/emailHtml";
import { CustomResponse } from "./errors";
import { GraphQLError } from "graphql";
import { RefreshToken } from "../../entities/RefreshToken";
import crypto from "crypto";
import { Poll } from "../../entities/Poll";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // tu email
    pass: process.env.GMAIL_APP_PASS, // password o app password
  },
});

// ===== QUERY RESOLVERS =====
const login = async (_, args: any, { em }) => {
  const { emailOrNickname, password } = args;

  //  em.setFilterParams("companyContext", {
  //    companyId: comapanyIdParam,
  //  });
  try {
    const user: User = await em.findOne(
      User,
      {
        $or: [{ email: emailOrNickname }, { nickname: emailOrNickname }],
      },
      {
        populate: [
          "password",
          "schedules.id",
          "schedules.startDate",
          "companies",
        ],
        filters: false,
      }
    );

    const passwordCorrect =
      user === null ? false : await bcrypt.compare(password, user.password);
    if (!(user && passwordCorrect)) {
      return CustomResponse(400, "Invalid email/nickname or password");
    }

    const idForToken = {
      id: user.id,
    };

    const token = jwt.sign(idForToken, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    const refreshTokenString = crypto.randomBytes(64).toString("hex");
    const refreshToken = new RefreshToken(
      user,
      refreshTokenString,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    );

    await em.persistAndFlush(refreshToken);

    //user.activeCompanyId = activeCompanyIdParam
    //await em.persistAndFlush(user);

    if (token) {
      if (user.companies.getItems().length === 0) {
        user.activeCompanyId = user.contextCompanyId;
        await em.persistAndFlush(user);
        return CustomResponse(200, "Login successful", true, {
          user,
          companies: user.companies.getItems(),
          tokens: {
            token,
            refreshToken: refreshTokenString,
          },
        });
      } else {
        return CustomResponse(200, "User needs to select company", true, {
          user,
          tokens: {
            token,
            refreshToken: refreshTokenString,
          },
        });
      }
    } else {
      return CustomResponse(400, "Login failed");
    }
  } catch (error) {
    console.log(error);
    return CustomResponse(400, "Login failed");
  }
};

const loginWithId = async (_, args: any, { em }) => {
  const { id } = args;
  const user = await em.findOne(User, { id }, { populate: ["password"] });
  return login(
    _,
    { email: user.email, password: process.env.DEFAULT_PASSWORD || "123456" },
    { em }
  );
};

// ===== MUTATION RESOLVERS =====
const forgotPassword = async (_, { email }, { em }: { em: EntityManager }) => {
  const user = await em.findOne(User, { email });
  if (!user) {
    return {
      success: false,
      code: "400",
      message: "No existe un usuario con ese email",
      user: null,
      token: null,
    };
  }

  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });

  console.log(`Reset token for ${email}: ${resetToken}`);
  return {
    success: true,
    code: "201",
    message:
      "Se ha enviado un correo con las instrucciones para recuperar tu contraseña",
    user: null,
    token: null,
  };
};

const updatePassword = async (
  _,
  {
    password: { currentPassword, newPassword, confirmPassword },
  }: {
    password: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };
  },
  { currentUser, em }
) => {
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  try {
    ChangePasswordSchema.parse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  } catch (error) {
    return {
      success: false,
      code: "400",
      message: "Validation error",
      user: null,
    };
  }

  const user = await em.findOne(
    User,
    { id: currentUser.id },
    { populate: ["password"] }
  );
  if (!user) {
    return {
      success: false,
      code: "400",
      message: "No user found",
      user: null,
      token: null,
    };
  }

  const passwordCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!passwordCorrect) {
    return {
      success: false,
      code: "400",
      message: "Current password is incorrect",
      user: null,
      token: null,
    };
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await em.persistAndFlush(user);

  return {
    success: true,
    code: "200",
    message: "password changed successfully",
    user: null,
    token: null,
  };
};

const sendChangePasswordEmail = async (_: any, args: any) => {
  const { email } = args;

  const tmpPassword = generateTempPassword(6);

  const payload = {
    email: email,
    purpose: "reset-password",
    password: tmpPassword,
  };
  // firma un JWT corto (por ejemplo, 30 min de vida)
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30m" });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Change your password",
    html: changePasswordHtml(token, tmpPassword),
  });

  return CustomResponse(200, "Change password email sent", true, {});
};

async function loginWithGoogle(_: any, args: any, { em }) {
  const { id_token } = args;

  const googleData = await verifyGoogleToken(id_token);
  if (!googleData) return CustomResponse(401, "No Google user found");

  const { email, name, picture } = googleData;

  // Buscar usuario
  let user: User = await em.findOne(
    User,
    { email },
    { populate: ["companies"], filters: false }
  );

  // Si no existe, lo creamos
  if (!user) {
    user = em.create(User, {
      email,
      name,
      nickname: email.split("@")[0],
      provider: UserProviderType.GOOGLE,
    });
    await em.persistAndFlush(user);
  }

  // Generamos JWT
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "30m",
    }
  );
  const refreshTokenString = crypto.randomBytes(64).toString("hex");
  const refreshToken = new RefreshToken(
    user,
    refreshTokenString,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  );

  await em.persistAndFlush(refreshToken);

  return CustomResponse(200, "User logged in successfully", true, {
    tokens: { token, refreshToken: refreshTokenString },
    user,
    companies: user.companies.getItems(),
  });
}

export const authResolvers = {
  Query: {
    login,
    loginWithId,
  },
  Mutation: {
    forgotPassword,
    updatePassword,
    loginWithGoogle,
    sendChangePasswordEmail,
  },
};
