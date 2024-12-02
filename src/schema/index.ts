import {me, allUsers, user, createUser, updateUser, resetPassword, removeUser} from "../graphql/resolvers/UserResolver";

const resolvers = {
    Query: {
        allUsers,
        me,
        user
    },
    Mutation: {
        createUser,
       /* updateUser,
        resetPassword,
        removeUser*/
    }
}

export default resolvers
