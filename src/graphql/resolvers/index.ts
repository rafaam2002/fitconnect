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
  getSchedulesRange,
  getSchedulesResumeRange,
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
  createScheduleDevelopment,
  addUserToSchedule,
  removeUserFromSchedule,
  exampleMutation,
} from "./user/mutations";
import { createPlan, removePlan, updatePlan } from "./plan/mutations";
import { getPlans } from "./plan/queries";
import { probe } from "./user/subscriptions";
import { getProducts } from "./product/queries";
import { getArticles } from "./article/queries";

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
    getSchedulesRange,
    getSchedulesResumeRange,
    getProducts,
    getArticles,
  },
  Mutation: {
    exampleMutation,
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
    createScheduleDevelopment,
    addUserToSchedule,
    removeUserFromSchedule,
  },
  Subscription: {
    probe,
  },
};

export default resolvers;
