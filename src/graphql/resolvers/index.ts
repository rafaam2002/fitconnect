import {
  me,
  allUsers,
  findUser,
  getMessagesSent,
  getMessagesReceived,
  getSchedules,
} from "./user/queries";

const resolvers = {
  Query: {
    allUsers,
    me,
    findUser,
    getMessagesSent,
    getMessagesReceived,
    getSchedules,
  },
  Mutation: {
    //createUser,
    /* updateUser,
        resetPassword,
        removeUser*/
  },
};

export default resolvers;
