import { Company } from "../entities/Company";
import { MemberShip } from "../entities/MemberShip";
import { UserRole } from "./enums";

export type UserType = {
  id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  currentRole: UserRole;
  currentCompany: Pick<Company, "id"> | null;
  isActive: boolean;
  isBlocked: boolean;
  phoneNumber?: string;
  nickname: string;
  stripeCustomerId?: string;
  name?: string;
  isVerified: boolean;
  activeMembership?: MemberShip;
};

export type UserFilter = {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  nickname: string;
  role: UserRole;
  isActive: boolean;
};
