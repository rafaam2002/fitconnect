import {
  me,
  allUsers,
  findUser,
  getMessagesSent,
  getMessagesReceived,
  getSchedules,
  getPolls,
  currentUser
} from './user/queries'
import {login} from "./auth/queries";
import {changePassword, forgotPassword} from "./auth/mutations";
import {createUser} from "./user/mutations";
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
    currentUser
  },
  Mutation: {
    createUser,
    changePassword,
    forgotPassword,
    // createUser,
    /* updateUser,
        resetPassword,
        removeUser */
  }
}

export default resolvers
