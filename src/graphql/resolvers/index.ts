import {
  me,
  allUsers,
  findUser,
  getSchedules,
  getPolls,
  getConversation,
  getNotifications,
  getScheduleOptions,
  getSchedulesResume,
  getTodaySchedulesResume,
  getSchedulesFromToday,
} from "./user/queries";
import { login, loginWithId } from "./auth/queries";
import { updatePassword, forgotPassword } from "./auth/mutations";
import {
  createMessage,
  createPoll,
  createSchedule,
  createScheduleProgrammed,
  createSubscription,
  createOrChangePollVote,
  updateUser,
  removeSubscription,
  cancelSchedule,
  deletePollVote,
} from "./user/mutations";
import { createPlan, removePlan, updatePlan } from "./plan/mutations";
import { getPlans } from "./plan/queries";
import { GraphQLScalarType } from "graphql";

const resolvers = {
  Query: {
    login,
    loginWithId,
    allUsers,
    me,
    findUser,
    getSchedules,
    getPolls,
    getConversation,
    getPlans,
    getNotifications,
    getSchedulesResume,
    getScheduleOptions,
    getTodaySchedulesResume,
    getSchedulesFromToday,
  },
  Mutation: {
    updateUser,
    updatePassword,
    forgotPassword,
    createMessage,
    createSchedule,
    createScheduleProgrammed,
    createPoll,
    createOrChangePollVote,
    createPlan,
    updatePlan,
    removePlan,
    createSubscription,
    removeSubscription,
    cancelSchedule,
    deletePollVote,
  },
};

export default resolvers;
