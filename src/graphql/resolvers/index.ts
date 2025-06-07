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
  getTrainingTasks,
  getUserWeights,
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
  unfixMessage,
  createTrainingTask,
  removeTrainingTask,
  addUserWeight,
  removeUserWeight,
  removeSchedule,
  updateUserPicture,
} from "./user/mutations";
import { createPlan, removePlan, updatePlan } from "./plan/mutations";
import { getPlans } from "./plan/queries";
import { fixedMessages, newMessage } from "./user/subscriptions";
import { getProducts } from "./product/queries";
import { getArticles } from "./article/queries";
import { getPresignedUrl } from "./s3/queries";
import { createProduct, updateProductPicture } from "./product/mutations";
import {registerToken, sendNotification} from "./token/mutations";

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
    getTrainingTasks,
    getUserWeights,
    getPresignedUrl,
   
  },
  Mutation: {
    updateUser,
    createUser,
    updateUserPicture,
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
    unfixMessage,
    fixMessage,
    createTrainingTask,
    removeTrainingTask,
    addUserWeight,
    removeUserWeight,
    removeSchedule,
    createProduct,
    updateProductPicture,
    registerToken,
    sendNotification
  },
  Subscription: {
    newMessage,
    fixedMessages,
  },
};

export default resolvers;
