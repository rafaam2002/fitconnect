import {
  me,
  allUsers,
  findUser,
  getMessagesSent,
  getMessagesReceived,
  getSchedules,
  getPolls,
} from "./user/queries";

const resolvers = {
  Query: {
    allUsers,
    me,
    findUser,
    getMessagesSent,
    getMessagesReceived,
    getSchedules,
    getPolls,
  },
  Mutation: {
    //createUser,
    /* updateUser,
        resetPassword,
        removeUser*/
  },
};

export default resolvers;
