import z from 'zod';

import { messages } from './functions';

export const updateUserSchema = z.object({
  nickname: z
    .string()
    .min(3, messages.minErrorMsg(3))
    .max(20, messages.maxErrorMsg(20))
    .regex(/^\S*$/, messages.noSpacesErrorMsg),
  email: z.string().email(messages.emailErrorMsg),
  name: z
    .string()
    .min(3, messages.minErrorMsg(3))
    .max(50, messages.maxErrorMsg(50))
    .nullable()
    .optional(),
  surname: z
    .string()
    .min(3, messages.minErrorMsg(3))
    .max(20, messages.maxErrorMsg(20))
    .nullable()
    .optional(),
  phoneNumber: z
    .string()
    .min(9, messages.minErrorMsg(9))
    .max(9, messages.maxErrorMsg(9))
    .regex(/^\d+$/, messages.phoneNumberErrorMsg)
    // Solo permite caracteres numéricos
    .nullable()
    .optional(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, messages.minErrorMsg(6)),
    newPassword: z.string().min(6, messages.minErrorMsg(6)),
    confirmPassword: z.string().min(6, messages.minErrorMsg(6)),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: messages.passwordDontMatchErrorMsg,
  });

export const AdminChangePasswordSchema = z
  .object({
    newPassword: z.string().min(6, messages.minErrorMsg(6)),
    confirmPassword: z.string().min(6, messages.minErrorMsg(6)),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: messages.passwordDontMatchErrorMsg,
  });

export const NewPollSchema = z.object({
  title: z
    .string()
    .min(3, messages.minErrorMsg(3))
    .max(50, messages.maxErrorMsg(20)),
  options: z
    .array(
      z
        .string()
        .min(1, messages.minErrorMsg(3))
        .max(100, messages.maxErrorMsg(20))
    )
    .max(10, messages.maxNumberErrorMsg(10)),
  endDate: z.date(),
});
