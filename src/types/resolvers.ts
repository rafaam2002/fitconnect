import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "../entities/User";
import { UserType } from "./user";
import { ScheduleState } from "./enums";


export type UserProps = {
    user: User;
    userId?: string;
};

export type ContextProps = {
  em: EntityManager | any;
  currentUser: UserType;
};

export type MessageProps = {
  message: {
    text: string;
    receiverId: string;
    isFixed: boolean;
    fixedDuration: number;
  };
};

export type ScheduleProps = {
  schedule: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    maxUsers: number;
    repeatDays: number[];
  };
};

export type RemoveSheduleProps = {
  scheduleId: string;
  userId?: string;
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
  textFilter: string;
  page: number;
};

export type GetPollProps = { pollId: string; filter: { since: string } };

export type IdProps = { id: string };

export type GetScheduleProps = { scheduleId: string; calculateIsBooked: boolean };

export type GetConversationProps = { otherUserId?: string; page?: number, limit?: number };

export type GetScheduleRangeProps = {
  startDate: string;
  endDate: string;
  calculateIsBooked: boolean;
  mySchedules: boolean;
};

export type ScheduleResumeRange = {
  startDate: string;
  endDate: string;
  calculateIsBooked: boolean;
};

export type ScheduleStatsProps = {
  month: number;
};

export type GetMonthlyScheduleStats = {
  month: number;
  startHour: string;
};
