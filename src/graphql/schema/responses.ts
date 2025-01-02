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
    text: String!
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
    polls: [Poll]
    userVotes: [PollVote]
}

type MessageResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    sms: Message
    messages: [Message]
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
`;

