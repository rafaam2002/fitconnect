import {UserRole} from "../entities/User";

export type UserType = {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
  role: UserRole;
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
  role: UserRole;
  isActive: boolean;
};
