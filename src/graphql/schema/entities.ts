export const graphqlEntities = `
scalar JSON
scalar DateTime

type PictureUrl {
    id: ID!
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

type Company {
    id: ID!
    name: String!
    phoneNumber: String!
    email: String!
    address: String!
    logo: PictureUrl
    pictures: [PictureUrl]
    scheduleOptions: ScheduleOptions
    companyConfig: CompanyConfig
    amIPending: Boolean
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
    schedules: [Schedule]
    userWeights: [UserWeight]
    phoneNumber: String
    isVerified: Boolean
    companies: [Company]
    contextRole: UserRoleEnum
    activeCompanyId: ID
    isPending: Boolean
    subscription: JSON
    permissions: [String]
}

type Schedule {
    id: ID!
    description: String
    title: String!
    age: Int
    users: [User]
    created_at: String!
    updated_at: String!
    startDate: DateTime!
    endDate: DateTime!
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
    bookingCutoffMinutes: Int!
    minBookingsRequired: Int!
}

type CompanyConfig {
    pollsEnabled: Boolean!
    productsEnabled: Boolean!
    chatEnabled: Boolean!
    trainingEnabled: Boolean!
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
    receiver: UserResumeResponse
    isForumMessage: Boolean!
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
    amount: Float!
    currency: Currency!
    interval: PlanInterval!
    intervalCount: Int
    trialPeriodDays: Int
    status: PlanStatus!
    isActive: Boolean!
    features: [String]!
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
    transactions: [Transaction]
}

type Card {
    number: String!
    exp_month: String!
    exp_year: String!
    cvc: Int!
}

type Transaction {
    id: ID!
    stripeChargeId: ID
    stripePaymentId: ID
    user: User
    paymentMethod: PaymentMethod
    type: TransactionType
    status: TransactionStatus
    formattedAmount: Float
    currency: Currency
    description: String
    isSuccessful: Boolean
    metadata: JSON
    created_at: String!
}

type UserStats {
    totalUsers: Int!
    notActiveUsers: Int!
    blockedUsers: Int!
    newUsers: Int!
    pendingUsers: Int!
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

type StripeCustomer {
    id: ID!
    created_at: String!
    updated_at: String!
    stripeCustomerId: String!
    user: User
    isActive: Boolean
    defaultCurrency: Currency
}

type PaymentMethod {
    id: ID!
    stripeCustomer: StripeCustomer!
    type: PaymentMethodType
    status: PaymentMethodStatus
    brand: String
    last4: String
    expiryMonth: String
    expiryYear: String
    country: String
    isDefault: Boolean
    stripePaymentMethodId: String 
}

type Stats {
    total: Int
    active: Int
    expired: Int
    hasDefault: Boolean
    byBrand: JSON
}

type Tokens {
    token: String
    refreshToken: String
}
`;
