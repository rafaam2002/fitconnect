import { UserRoleEnum } from "./enums";

export type UserType = {
  id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  contextRole?: UserRoleEnum;
  activeCompanyId?: string | null;
  isActive: boolean;
  isBlocked: boolean;
  phoneNumber?: string;
  nickname: string;
  stripeCustomerId?: string;
  name?: string;
  isVerified: boolean;
};

export type UserFilter = {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  nickname: string;
  role: UserRoleEnum;
  isActive: boolean;
};
