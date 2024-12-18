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
type SchedulesResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
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
}

type PollsResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    polls: [Poll]
    userVotes: [PollVote]
}

type MessageResponse implements BasicResponse{
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
`;

