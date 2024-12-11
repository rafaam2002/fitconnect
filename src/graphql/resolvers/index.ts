import { fi } from "@faker-js/faker/.";
import {
  me,
  allUsers,
  findUser,
  createUser,
  getMessagesSent,
  getMessagesReceived,
  updateUser,
  resetPassword,
  removeUser,
  getSchedules,
} from "./UserResolver";

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
    createUser,
    /* updateUser,
        resetPassword,
        removeUser*/
  },
};

export default resolvers;
