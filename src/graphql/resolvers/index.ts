import {
  me,
  allUsers,
  findUser,
  getSchedules,
  getPolls,
  getConversation,

} from './user/queries'
import {login, loginWithId} from "./auth/queries";
import {changePassword, forgotPassword} from "./auth/mutations";
import {addMessage, addPoll, addSchedule, addScheduleProgrammed, addVote, createUser} from "./user/mutations";
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
  }
}

export default resolvers
