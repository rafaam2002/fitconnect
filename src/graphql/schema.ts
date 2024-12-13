export const typeDefs = `#graphql
enum NotificationTypeEnum {
    MESSAGE
    WARNING
    ERROR
    INFO
}

enum UserRolEnum {
    standard
    boss
    premium
}

interface MutationResponse {
    code: String!
    success: Boolean!
    message: String!
}

type Tokens {
    token: String
    refeshToken: String
}

type User {
    id: ID!
    name: String!
    surname: String
    email: String!
    profilePicture: String
    nickname: String
    isActive: Boolean
    isBlocked: Boolean
    rol: UserRolEnum!
}

type Schedule {
    id: ID!
    created_at: String!
    updated_at: String!
    startTime: String!
    Duration: Int!
    maxUsers: Int!
    isCancelled: Boolean!
    isProgammed: Boolean!
}

type UserResponse implements MutationResponse {
    code: String!
    success: Boolean!
    message: String!
    user: User
}

type UsersResponse implements MutationResponse {
    code: String!
    success: Boolean!
    message: String!
    users: [User]
}

type ScheduleResponse implements MutationResponse{
    code: String!
    success: Boolean!
    message: String!
    schedule: Schedule
}

type LoginResponse implements MutationResponse{
    code: String!
    success: Boolean!
    message: String!
    user: User
    tokens: Tokens
}

type MessageResponse {
    id: ID!
    created_at: String!
    updated_at: String!
    message: String!
    isFixed:Boolean!
    fixedDuration: Int!
    sender: String!
    reciver: String!
}

type NotificationResponse {
    id: ID!
    created_at: String!
    updated_at: String!
    type:NotificationTypeEnum!
    message: String!
    fixedDuration: Int!
    link: String!
}

type ScheduleOptionResponse{
    id: ID!
    maxActiveReservations: Int!
    cancellationDeadline: Int!
    maxStrikesBeforePenalty: Int!
    penaltyDuration: Int!
    maxAdvanceBookingDays: Int!
}

type PollResponse{
    id: ID!
}

input UserInput{
    name: String!
    surname: String!
    password: String!
    email: String!
    nickname: String!
}

input CreateUserInput {
    name: String!
    surname: String!
    email: String!
    password: String!
    nickname: String
    profilePicture: String
}

input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
}

type Query {
    # ----------------- Login ----------------
    login(email: String!, password: String!): LoginResponse!
    # ----------------- User -----------------
    allUsers: UsersResponse!
    me: UserResponse,
    findUser(id: ID!): UserResponse
    getMessagesSent: [MessageResponse]!
    getMessagesReceived: [MessageResponse]!
    getNotifications: [NotificationResponse]!
    getSchedules: [ScheduleResponse]!
    getSchedules_option: [ScheduleOptionResponse]!
    getPolls: [PollResponse]!
    currentUser: UserResponse!

    # ----------------- Messages -----------------
    Messages: [MessageResponse]!
    # ----------------- Notifications -----------------
    Notifications: [NotificationResponse]!
    # ----------------- Schedules -----------------
    Schedules: [ScheduleResponse]!
    # ----------------- Schedules_option -----------------
    Schedules_option: [ScheduleOptionResponse]!


}

type Mutation {
    createUser ( user: CreateUserInput!): UserResponse
    register(input: CreateUserInput!): LoginResponse!
    forgotPassword(email: String!): String!
    changePassword(input: ChangePasswordInput!): String!
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
`
