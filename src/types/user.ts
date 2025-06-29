import { UserRol } from "./enums";

export type UserType = {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
  rol: UserRol;
  isActive: boolean;
  isBlocked: boolean;
  profilePicture: string;
  phoneNumber: string;
  nickname: string;
  stripeCustomerId: string;
  name: string;
  isVerified: boolean;
};

export type UserFilter = {
  name: string;
  surname: string;
  username: string;
  email: string;
  phoneNumber: string;
  nickname: string;
  rol: UserRol;
  isActive: boolean;
};
