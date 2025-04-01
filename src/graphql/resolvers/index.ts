import {
  me,
  getUsers,
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
  getAdminStats,
  getSchedulesStats,
  getMonthlySchedules,
} from "./user/queries";
import { login, loginWithId } from "./auth/queries";
import { updatePassword, forgotPassword } from "./auth/mutations";
import {
  createMessage,
  createPoll,
  createSchedule,
  createSubscription,
  createOrChangePollVote,
  updateUser,
  removeSubscription,
  deletePollVote,
  createScheduleDevelopment,
  addUserToSchedule,
  removeUserFromSchedule,
  createUser,
  changeScheduleStatus,
  fixMessage,
} from "./user/mutations";
import { createPlan, removePlan, updatePlan } from "./plan/mutations";
import { getPlans } from "./plan/queries";
import { newMessage } from "./user/subscriptions";
import { getProducts } from "./product/queries";
import { getArticles } from "./article/queries";

const resolvers = {
  Query: {
    login,
    loginWithId,
    getUsers,
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
    getAdminStats,
    getSchedulesStats,
    getMonthlySchedules,
  },
  Mutation: {
    updateUser,
    createUser,
    updatePassword,
    forgotPassword,
    createMessage,
    createSchedule,
    createPoll,
    createOrChangePollVote,
    createPlan,
    updatePlan,
    removePlan,
    createSubscription,
    removeSubscription,
    changeScheduleStatus,
    deletePollVote,
    createScheduleDevelopment,
    addUserToSchedule,
    removeUserFromSchedule,
    fixMessage,
  },
  Subscription: {
    newMessage,
  },
};

export default resolvers;
