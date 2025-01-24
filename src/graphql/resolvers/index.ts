import {
  me,
  allUsers,
  findUser,
  getSchedules,
  getPolls,
  getConversation,
  getNotifications,
  getScheduleOptions
} from './user/queries'
import {login, loginWithId} from "./auth/queries";
import {changePassword, forgotPassword} from "./auth/mutations";
import {
  createMessage,
  createPoll,
  createSchedule,
  createScheduleProgrammed,
  createSubscription,
  createVote,
  createUser, removeSubscription,
  cancelSchedule
} from "./user/mutations";
import {createPlan, removePlan, updatePlan} from "./plan/mutations";
import {getPlans} from "./plan/queries";
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
    getScheduleOptions
  },
  Mutation: {
    createUser,
    changePassword,
    forgotPassword,
    createMessage,
    createSchedule,
    createScheduleProgrammed,
    createPoll,
    createVote,
    createPlan,
    updatePlan,
    removePlan,
    createSubscription,
    removeSubscription,
    cancelSchedule
  }
}

export default resolvers
