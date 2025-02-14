export const graphqlResponses = `
interface BasicResponse {
    code: String!
    success: Boolean!
    message: String!
}

type UserResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    user: User
    users: [User]
}

type ScheduleResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    schedule: Schedule
    schedules: [Schedule]
}

type ScheduleResumeResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    schedulesResume: [ScheduleResume]
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

type NotificationResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    notification: Notification
    notifications: [Notification]
}

type ScheduleOptionsResponse implements BasicResponse{
   code: String!
    success: Boolean!
    message: String!
    scheduleOptions: ScheduleOptions
}

type PollResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    poll: Poll
    polls: [Poll]
}

type MessageResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    sms: Message
    conversations: [[Message]]
}

type PlanResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    plan: Plan
    plans: [Plan]
}

type SubscriptionResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
}

type IdResponse {
id: ID!
}

type UserResumeResponse {
    id: ID!
    nickname: String!
    profilePicture: String
    rol: UserRol!
}
`;
