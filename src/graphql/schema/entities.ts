export const graphqlEntities = `
type UserWeight {
    id: ID!
    weight: Float!
    date: String!
    user: UserResumeResponse!
}

type TrainingTask {  
    id: ID!
    content: String!
    user: User
    date: String
    repeat: Boolean!
}

type Article {
    id: ID!
    publishedAt: String!
    title: String!
    description: String!
    link: String!
    image: String!
}

type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    pictures: [String]
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
    rol: UserRol!
    token: String
    schedules: [Schedule]
    userWeights: [UserWeight]
    phoneNumber: String
}

type Schedule {
    id: ID!
    description: String
    title: String!
    users: [User]
    created_at: String!
    updated_at: String!
    startDate: String!
    endDate: String!
    maxUsers: Int!
    admin: User!
    state: ScheduleState!
    isBooked: Boolean
}

type ScheduleResume {
    id: ID!
    startDate: String!
    maxUsers: Int!
    state: ScheduleState!
    ocupancy: Int!
    isBooked: Boolean
}

type ScheduleProgrammed {
    id: ID!
    title: String!
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
    fixedEndDate: String
    fixedAdmin: UserResumeResponse
    sender: UserResumeResponse!
    receiver: UserResumeResponse!
}

type Conversation {
    otherUserId: ID
    messages: [Message]
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
    features: [String]
    icon: String
    isBestChoice: Boolean
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

type UserStats {
    totalusers: Int!
    activeusers: Int!
    blockedusers: Int!
    inactiveusers: Int!
}

type AdminStats {
    users: UserStats!
    schedules: Int!
    polls: Int!
    plans: Int!
    subscriptions: Int!
    transactions: Int!
    notifications: Int!
}

type GroupUser {
    standard: [User]
    specialRoles: [User]
}
`;
