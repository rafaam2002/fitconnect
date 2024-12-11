import { fi } from "@faker-js/faker/.";
import {
  me,
  allUsers,
  user,
  createUser,
  updateUser,
  resetPassword,
  removeUser,
  findUser,
} from "../resolvers/UserResolver";

const resolvers = {
  Query: {
    allUsers,
    me,
    user,
    findUser,
  },
  Mutation: {
    createUser,
    /* updateUser,
        resetPassword,
        removeUser*/
  },
};

export default resolvers;
