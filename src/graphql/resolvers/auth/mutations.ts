import { EntityManager } from "@mikro-orm/core";
import { User } from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ChangePasswordSchema } from "../../../validation/schemas";
import { generateTempPassword } from "../../../utils/users";
import nodemailer from "nodemailer";
import { changePasswordHtml } from "../../../utils/emailHtml";
import { CustomResponse } from "../errors";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // tu email
    pass: process.env.GMAIL_APP_PASS, // password o app password
  },
});

export const forgotPassword = async (
  _,
  { email },
  { em }: { em: EntityManager }
) => {
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
    expiresIn: "15m",
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

export const updatePassword = async (
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
    return {
      success: false,
      code: "400",
      message: "Please login",
      user: null,
      token: null,
    };
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

export const sendChangePasswordEmail = async (_: any, args: any) => {
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
