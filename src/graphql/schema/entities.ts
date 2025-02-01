export const graphqlEntities = `
type User {
    id: ID!
    name: String!
    surname: String
    email: String!
    profilePicture: String
    nickname: String
    isActive: Boolean
    isBlocked: Boolean
    rol: UserRol!
    schedules: [Schedule]
}

type Schedule {
    id: ID!
    users: [User]
    created_at: String!
    updated_at: String!
    startDate: String!
    endDate: String!
    maxUsers: Int!
    admin: User!
    isCancelled: Boolean!
}

type ScheduleResume {
    id: ID!
    startDate: String!
    maxUsers: Int!
    isCancelled: Boolean!
    ocupacy: Int!
}

type ScheduleProgrammed {
    id: ID!
    created_at: String!
    updated_at: String!
    daysOfWeek: [Int]
    startHour: String!
    endHour: String!
    maxUsers: Int!
    admin: User!
}
    
type ScheduleOptions {
 id: ID!
    maxActiveReservations: Int!
    cancellationDeadline: Int!
    maxStrikesBeforePenalty: Int!
    penaltyDuration: Int!
    maxAdvanceBookingDays: Int!
}

type Poll {
    id: ID!
    created_at: String!
    updated_at: String!
    endDate: String!
    title: String!
    options: [String]!
    admin: User!
    pollVotes: [PollVote]

}

type PollVote { 
    id: ID!
    poll: IdResponse!
    user: User!
    optionSelected: String!
}

type Message {
    id: ID!
    created_at: String!
    text: String!
    isFixed:Boolean
    fixedDuration: Int
    sender: IdResponse!
    receiver: IdResponse!
}

type Plan {
    id: ID!
    created_at: String!
    updated_at: String!
    name: String!
    description: String!
    price: Float!
    currency: String!
    paymentType: PaymentType!
    durationInDays: Int!
    subscriptions: [Subscription]
}

type Notification {
    id: ID!,
    created_at: String!
    updated_at: String!
    type: NotificationType!
    message: String! 
    link: String!
    user: IdResponse!
}

type Subscription {
    id: ID!
    created_at: String!
    updated_at: String!
    user: IdResponse !
    status: SubscriptionStatus!
    startDate: String!
    endDate: String!
    transctions: [Transaction]
}

type Card {
    id: ID!
    created_at: String!
    updated_at: String!
    user: User!
    type: CreditCardType!
    provider: CreditCardProvider!
}

type Transaction {
    id: ID!
    created_at: String!
    updated_at: String!
    subscription: ID!
    user: IdResponse!
    card: IdResponse!
    paymentMethod: PaymentMethod!
    amount: Float!
    currency: Currency!
    status: TransactionStatus!
    transactionId: String!
    reference: String!
    transactionDate: String!
    description: String!
    authCode: String!
}
`;
