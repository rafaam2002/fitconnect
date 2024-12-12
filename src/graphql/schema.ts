export const typeDefs = `#graphql
enum NotificationType {
    MESSAGE
    WARNING
    ERROR
    INFO
}

enum UserRol {
    standard
    boss
    premium
}

type Message {
    id: ID!
    created_at: String!
    updated_at: String!
    message: String!
    isFixed:Boolean!
    fixedDuration: Int!
    sender: String!
    reciver: String!
}

type Notification {
    id: ID!
    created_at: String!
    updated_at: String!
    type:NotificationType!
    message: String!
    fixedDuration: Int!
    link: String!
}

type User {
    id: ID!
    name: String!
    surname: String!
    email: String!
    profilePicture: String
    nickname: String!
    isActive: Boolean!
    isBlocked: Boolean!
    rol: UserRol!
}

type Schedule{
    id: ID!
    created_at: String!
    updated_at: String!
    startTime: String!
    Duration: Int!
    maxUsers: Int!
    isCancelled: Boolean!
    isProgammed: Boolean!
}

type Schedules_option{
    id: ID!
    maxActiveReservations: Int!
    cancellationDeadline: Int!
    maxStrikesBeforePenalty: Int!
    penaltyDuration: Int!
    maxAdvanceBookingDays: Int!
}

type Poll{
    id: ID!
}

input UserInput{
    name: String!
    surname: String!
    password: String!
    email: String!
}

type Query {
    # ----------------- User -----------------
    allUsers: [User]!
    me: User,
    user(id: ID!): User
    findUser(id: ID!): User
    getMessagesSent: [Message]!
    getMessagesReceived: [Message]!
    getNotifications: [Notification]!
    getSchedules: [Schedule]!
    getSchedules_option: [Schedules_option]!
    getPolls(): [Poll]!

    # ----------------- Messages -----------------
    Messages: [Message]!
    # ----------------- Notifications -----------------
    Notifications: [Notification]!
    # ----------------- Schedules -----------------
    Schedules: [Schedule]!
    # ----------------- Schedules_option -----------------
    Schedules_option: [Schedules_option]!

}

type Mutation {
    createUser (
        user: UserInput!
    ): User
}
# type Mutation {
#   addUser (
#     name: String!
#     email: String!
#     password: String!
#   ): User

#   addPost (
#     title: String!
#     content: String!
#     draft: Boolean!
#     userId: ID!
#   ): Post
# }
`;
