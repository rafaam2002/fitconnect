import {
  me,
  allUsers,
  findUser,
  getSchedules,
  getPolls,
  getConversation

} from './user/queries'
import {login, loginWithId} from "./auth/queries";
import {changePassword, forgotPassword} from "./auth/mutations";
import {
  addMessage,
  addPoll,
  addSchedule,
  addScheduleProgrammed,
  addSubscription,
  addVote,
  createUser, removeSubscription
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
    getPlans
  },
  Mutation: {
    createUser,
    changePassword,
    forgotPassword,
    addMessage,
    addSchedule,
    addScheduleProgrammed,
    addPoll,
    addVote,
    createPlan,
    updatePlan,
    removePlan,
    addSubscription,
    removeSubscription
  }
}

export default resolvers
