export const graphqlResponses = `
interface BasicResponse {
    code: String!
    success: Boolean!
    message: String!
}

type DefaultResponse implements BasicResponse {
  code: String!
  success: Boolean!
  message: String!
}

type PresignedUrlResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    presignedUrl: String!
    key: String!
}

type UserWeightResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    userWeight: UserWeight
    userWeights: [UserWeight]
}

type TrainingTaskResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    trainingTask: TrainingTask
    trainingTasks: [TrainingTask]
}

type SchedulesStats {
    dayAndTime: String!
    ratio: Float!
}


type SchedulesStatsResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    stats: [[SchedulesStats]]!
} 

type SubscriptionsStats {
    planId: String!
    planName: String!
    count: Int!
}

type SubscriptionsStatsResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    stats: [SubscriptionsStats]!
}

type ArticleResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    article: Article
    articles: [Article]
    hasMore: Boolean
}

type ProductResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    product: Product
    products: [Product]
}

type UserResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    user: User
    users: [User]
    groupBy: GroupUser
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
    scheduleOptions: ScheduleOptions
}

type ScheduleOptionsResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    scheduleOptions: ScheduleOptions
}

type ScheduleProgrammedResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    scheduleProgrammed: ScheduleProgrammed
    schedulesProgrammed: [ScheduleProgrammed]
}

type LoginResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    user: User
    isNewUser: Boolean
    companies: [Company]
    tokens: Tokens
}

type MeResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    user: User
    companies: [Company]
}

type CompanyResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    company: Company
    companies: [Company]
}

type NotificationResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    notification: Notification
    notifications: [Notification]
    hasMore: Boolean
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

type ConversationResponse {
    messages: [[Message]]
    hasMore: Boolean
}

type MessageResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    sms: Message
    conversations: [[Message]]
    conversation: ConversationResponse
}

type PlanResponse implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    plan: Plan
    plans: [Plan]
}

type SubscriptionResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    subscription: Subscription
    subscriptions: [Subscription]
}

type IdResponse {
    id: ID!
}

type UserResumeResponse {
    id: ID!
    nickname: String!
    pictureUrl: PictureUrl
    contextRole: UserRoleEnum
}

type AdminStatsResponse {
    code: String!
    success: Boolean!
    message: String!
    stats: AdminStats
}

type RegisterTokenResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
}

type SendNotificationResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
}

type AddCreditCardResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
}

type CardResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    cards: [Card]
}

type StripeCustomerResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    customers: [StripeCustomer]
    customer: StripeCustomer
}

type PaymentMethodResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    paymentMethods: [PaymentMethod]
    paymentMethod: PaymentMethod
}

type SetupIntentResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    clientSecret: String          
    setupIntentId: String
}

type AttachPaymentMethodResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    paymentMethod: PaymentMethod
}

type StatsResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    stats: Stats
}

type TransactionResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    transactions: [Transaction]
    transaction: Transaction
    summary: JSON
}

type GlobalSystemStatsResponse implements BasicResponse {
    code: String!
    success: Boolean!
    message: String!
    totalUsers:Int
    totalCompanies: Int
}
`;
