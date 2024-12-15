import {
  me,
  allUsers,
  findUser,
  getMessagesSent,
  getMessagesReceived,
  getSchedules,
  getPolls,
  getConversation,

} from './user/queries'
import {login} from "./auth/queries";
import {changePassword, forgotPassword} from "./auth/mutations";
import {addMessage, addPoll, addSchedule, addScheduleProgrammed, addVote, createUser} from "./user/mutations";
const resolvers = {
  Query: {
    login,
    allUsers,
    me,
    findUser,
    getMessagesSent,
    getMessagesReceived,
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
