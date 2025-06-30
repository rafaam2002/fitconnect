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
  sendEmailVerification,
} from "./user/queries";
import { login, loginWithId } from "./auth/queries";
import { updatePassword, forgotPassword, sendChangePasswordEmail } from "./auth/mutations";
import {
  createMessage,
  createPoll,
  createSchedule,
  createOrChangePollVote,
  updateUser,
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
  updateScheduleOptions,
} from "./user/mutations";
import { createPlan, removePlan, updatePlan } from "./plan/mutations";
import { getPlans } from "./plan/queries";
import { fixedMessages, newMessage } from "./user/subscriptions";
import { getProducts } from "./product/queries";
import { getArticles } from "./article/queries";
import { getPresignedUrl } from "./s3/queries";
import { createProduct, updateProductPicture } from "./product/mutations";
import { registerToken, sendNotification } from "./token/mutations";
import {
  createSubscription,
  removeSubscription,
} from "./subscription/mutations";
import { addCreditCard } from "./paymentMethod/mutations";
import { getCards } from "./paymentMethod/queries";

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
    getCards,
    sendEmailVerification,
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
    sendNotification,
    addCreditCard,
    updateScheduleOptions,
    sendChangePasswordEmail

  },
  Subscription: {
    newMessage,
    fixedMessages,
  },
};

export default resolvers;
