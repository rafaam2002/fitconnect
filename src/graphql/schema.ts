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

interface BasicResponse {
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
    admin: User!
    isCancelled: Boolean!
    isProgammed: Boolean!
}

type ScheduleProgrammed {
    id: ID!
    created_at: String!
    updated_at: String!
    daysOfWeek: [Int]
    startHour: String!
    Duration: Int!
    maxUsers: Int!
    admin: User!
}

type PollOptionType {
    option: String!
    votes: Int!
}

type Poll {
    id: ID!
    created_at: String!
    updated_at: String!
    title: String!
    description: String!
    options: [PollOptionType]
}

type Message {
    id: ID!
    created_at: String!
    message: String!
    isFixed:Boolean
    fixedDuration: Int
    sender: String!
    reciver: String!
}


type UserResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    user: User
}

type UsersResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    users: [User]
}

type ScheduleResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    schedule: Schedule
}
type ScheduleProgrammedResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    scheduleProgrammed: ScheduleProgrammed
}

type LoginResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    user: User
    tokens: Tokens
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

type PollResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    poll: Poll
}

type PollsResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    # poll: [Poll]
}

type MessageResponse  implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    sms: Message
}

type MessagesResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    messages: [Message]
}

type MessagesReceived implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    messages: [Message]
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
    me: UserResponse!,
    findUser(id: ID!): UserResponse!
    getMessagesSent: MessagesResponse!
    getMessagesReceived: MessagesResponse!
    #otherUser default = 0 (forum) (juan miguel, te parece que el foro tenga id 0? por cierto, en el congelador deje una par de pingas fresquitas para ti)
    #each page will have 50 messages, default = 0 (first page)
    getConversation(otherUserId: ID, page: Int): MessagesResponse!
    getNotifications: [NotificationResponse]!
    getSchedules: [ScheduleResponse]!
    getSchedules_option: [ScheduleOptionResponse]!
    getPolls: PollsResponse!
    addMessage(message: String!, receiver: ID!): MessageResponse!
    addSchedule(startTime: String!, Duration: Int!, maxUsers: Int!): ScheduleResponse!
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
    addMessage(message: String!, receiver: ID!, isFixed: Boolean, fixedDuration: Boolean): MessageResponse!
    fixMessage(messageId: ID!, fixedDuration: Int!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!
    addSchedule(startDate: String!, Duration: Int!, maxUsers: Int!, isCancelled: Boolean): ScheduleResponse!
    addScheduleProgrammed(daysOfWeek: [Int], startHour: String!, Duration: Int!, maxUsers: Int!): ScheduleProgrammedResponse!
    cancelSchedule(scheduleId: ID!): ScheduleResponse!
    addPoll(title: String!, options: [String],durationDays: Int): PollResponse!
    addVote(pollId: ID!, option: String!): PollResponse!
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
