import {User} from "../../../entities/User";
import {EntityManager} from "@mikro-orm/core";
import {UserType} from "../../../types";
import {ScheduleState} from "../../../types/enums";

type UserProps = {
    user: User;
}

type ContextProps = {
    em: EntityManager|any;
    currentUser: UserType;
}

type MessageProps = {
    message: {
        text: string;
        receiverId: string;
        isFixed: boolean;
        fixedDuration: number;
    };
}

type ScheduleProps = {
    schedule: {
        title: string;
        description: string;
        startDate: string;
        endDate: string;
        maxUsers: number;
        repeatDays: number[];
    };
}

type RemoveSheduleProps = {
    scheduleId: string;
    userId?: string;
}

type ScheduleDevelopmentProps = {
    scheduleDevelopment: {
        title: string;
        startTime: string;
        endTime: string;
        maxUsers: number;
        state: ScheduleState;
    };
}

type PollProps = {
    poll: {
        title: string;
        options: string[];
        endDate: string;
    };
}

type VoteProps = {
    vote: {
        pollId: string;
        option: number;
    };
}

type DeletePollProps = {
    pollId: string;
}

type FixMessageProps = {
    messageId: string;
    duration: number;
}

type UnfixMessageProps = {
    messageId: string;
}

type ChangeScheduleStatusProp = {
    scheduleId: string;
}

type UserListProps = {
    textFilter: string;
    page: number;
}

type GetPollProps = { pollId: string; filter: { since: string }}

type IdProps = { id: string }

type GetScheduleProps = { scheduleId: string; calculateIsBooked: boolean }

type GetConversationProps  = { otherUserId: string; page: number }

type GetScheduleRangeProps = {
    startDate: string;
    endDate: string;
    calculateIsBooked: boolean;
    mySchedules: boolean;
}

type ScheduleResumeRange = {
    startDate: string;
    endDate: string;
    calculateIsBooked: boolean;
}

type ScheduleStatsProps = {
    month: number;
}

type GetMonthlyScheduleStats = {
    month: number;
    startHour: string;
}

export {
    UserProps,
    ContextProps,
    MessageProps,
    ScheduleProps,
    RemoveSheduleProps,
    ScheduleDevelopmentProps,
    PollProps,
    VoteProps,
    DeletePollProps,
    FixMessageProps,
    UnfixMessageProps,
    ChangeScheduleStatusProp,
    UserListProps,
    IdProps,
    GetScheduleProps,
    GetPollProps,
    GetConversationProps,
    GetScheduleRangeProps,
    ScheduleResumeRange,
    ScheduleStatsProps,
    GetMonthlyScheduleStats
}
