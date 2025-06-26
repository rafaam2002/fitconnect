export const graphqlEntities = `
type PictureUrl {
    name: String!
    url: String!
}

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
    pictures: [PictureUrl]
}

type User {
    id: ID!
    name: String
    surname: String
    email: String!
    pictureUrl: PictureUrl
    nickname: String!
    isActive: Boolean
    isBlocked: Boolean
    rol: UserRol!
    schedules: [Schedule]
    userWeights: [UserWeight]
    phoneNumber: String
}

type Schedule {
    id: ID!
    description: String
    title: String!
    age: Int
    users: [User]
    created_at: String!
    updated_at: String!
    startDate: String!
    endDate: String!
    maxUsers: Int!
    admin: User!
    state: ScheduleState!
    type: ScheduleType!
}

type ScheduleResume {
    id: ID!
    startDate: String!
    maxUsers: Int!
    state: ScheduleState!
    ocupancy: Int!
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
    description: String
    age: Int
    type: ScheduleType
}
    
type ScheduleOptions {
    id: ID!
    maxActiveReservations: Int!
    maxAdvanceBookingDays: Int!
    sameDayBookingAllowed: Boolean!
    fullOpenHours: Int! 
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
    totalUsers: Int!
    notActiveUsers: Int!
    blockedUsers: Int!
    newUsers: Int!
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

type ExpoPushToken {
    id: ID!
    token: String!
}

type Card {
    id: ID!
    created_at: String
    user: User
    cardBrand: String
    cardLast4: Int
    cardExpMonth: String
    cardExpYear: String
    status: PaymentMethodStatus
}
`;
