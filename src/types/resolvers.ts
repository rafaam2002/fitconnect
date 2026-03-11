import { EntityManager } from '@mikro-orm/postgresql';

import { User } from '../entities/User';

import { CurrentUser } from './common.type';
import { ScheduleState, ScheduleType, UserRoleEnum } from './enums';

export type UserProps = {
  user: User & {
    role: UserRoleEnum;
  };
  company?: CompanyProps;
};

export type CompanyProps = {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  isValidated: boolean;
};

export type UserPictureProps = {
  userId: string;
  picture: string;
  oldPicture?: string;
};

export type UpdateCompanyPictureProps = {
  companyId: string;
  picture: string;
};

export type ContextProps = {
  em: EntityManager | any;
  currentUser: CurrentUser;
};

export type MessageProps = {
  message: {
    text: string;
    receiverId: string;
    isFixed: boolean;
    fixedDuration: number;
    isForumMessage?: boolean;
  };
};

export type ScheduleProps = {
  schedule: {
    title: string;
    description: string;
    age?: number | null;
    type?: ScheduleType;
    startDate: string;
    endDate: string;
    maxUsers: number;
    repeatDays: number[];
    admin: string;
  };
};

export type RemoveUserSheduleProps = {
  scheduleId: string;
  userId?: string;
};

export type RemoveScheduleProps = {
  scheduleId: string;
};

export type updateScheduleOptionsProps = {
  scheduleOptions: {
    maxActiveReservations: number;
    maxAdvanceBookingDays: number;
    sameDayBookingAllowed: boolean;
    fullOpenHours: number;
  };
};

export type ScheduleDevelopmentProps = {
  scheduleDevelopment: {
    title: string;
    startTime: string;
    endTime: string;
    maxUsers: number;
    state: ScheduleState;
  };
};

export type PollProps = {
  poll: {
    title: string;
    options: string[];
    endDate: string;
  };
};

export type VoteProps = {
  vote: {
    pollId: string;
    option: number;
  };
};

export type DeletePollProps = {
  pollId: string;
};

export type GetCompanyProps = {
  companyId?: string;
  page?: number;
  query?: string;
};

export type UpdateCompanyProps = {
  companyId: string;
  companyData: {
    name?: string;
    address?: string;
    phoneNumber?: string;
    email?: string;
  };
  scheduleOptions: {
    maxActiveReservations?: number;
    maxAdvanceBookingDays?: number;
    sameDayBookingAllowed?: boolean;
    fullOpenHours?: number;
  };
};

export type FixMessageProps = {
  messageId: string;
  fixedEndDate: string;
};

export type UnfixMessageProps = {
  messageId: string;
};

export type ChangeScheduleStatusProp = {
  scheduleId: string;
};

export type UserListProps = {
  query: string;
  roleFilter?: UserRoleEnum[] | null;
  stateFilter?:
    | 'notActive'
    | 'blocked'
    | 'notVerified'
    | 'new'
    | 'pending'
    | null;
  page: number;
  filterMe?: boolean;
};

export type GetPollProps = { pollId: string; filter: { since: string } };

export type IdProps = { id: string };

export type AddScheduleProps = { scheduleId: string };

export type GetScheduleProps = {
  scheduleId: string;
  schedulesIds?: string[];
};

export type GetUserSchedulesProps = {
  userId?: string;
  past?: boolean;
};

export type GetConversationProps = {
  otherUserId?: string;
  page?: number;
  limit?: number;
  isForumMessage?: boolean;
};

export type GetScheduleRangeProps = {
  startDate: string;
  endDate: string;
  mySchedules: boolean;
};

export type ScheduleResumeRange = {
  startDate: string;
  endDate: string;
};

export type ScheduleStatsProps = {
  month: number;
};

export type GetMonthlyScheduleStats = {
  month: number;
  startHour: string;
};

export type CreateTrainingTaskProps = {
  trainingTask: {
    content: string;
    userId?: string | undefined;
    date: string;
    repeat: boolean;
  };
};

export type GetTrainingTaskProps = {
  userId?: string | null;
  dateRange: [string, string];
};

export type RemoveTrainingTaskProps = {
  ids: string[];
};

export type GetUserWeightsProps = {
  userId: string;
  dateRange?: [string, string];
};

export type AddUserWeight = {
  userWeight: {
    userId: string;
    weight: number;
    date: string;
  };
};

export type RemoveUserWeight = {
  ids: string[];
};

export type CreateProductProps = {
  product: {
    name: string;
    description: string;
    price: number;
    pictures: string[];
  };
};

export type UpdateProductImage = {
  imageName: string;
  imageUrl: string;
  productId: string;
};

export type NotificationProps = {
  notification: {
    body: string;
    title: string;
    forAll: boolean;
  };
};

export type DeletePollsProps = {
  ids: string[];
};

export type RemoveProductProps = {
  ids: string[];
};

export type LoginProps = {
  emailOrNickname: string;
  password: string;
};

export type PasswordResetProps = {
  email: string;
};

export type UpdatePasswordProps = {
  password: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
};
