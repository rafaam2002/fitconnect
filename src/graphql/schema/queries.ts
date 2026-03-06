export const graphqlQueries = `
type Query {
    # ----------------- Login ----------------
    login(emailOrNickname: String!, password: String!): LoginResponse!
    loginWithId(id: ID!): LoginResponse!

    # ----------------- User -----------------
    getUsers(query: String, page: Int, roleFilter: [UserRoleEnum], stateFilter: String): UserResponse!
    me: MeResponse,
    findUser(id: ID!): UserResponse!
    #otherUser default = 0 (forum) (juan miguel, te parece que el foro tenga id 0? por cierto, en el congelador deje una par de pingas fresquitas para ti)
    #each page will have 50 messages, default = 0 (first page)
    sendEmailVerification: DefaultResponse!
    
    # ----------------- Message -----------------
    getConversation(otherUserId: ID, page: Int, limit: Int, isForumMessage: Boolean): MessageResponse!
    getNotifications: NotificationResponse!

    # ----------------- Schedule -----------------
    getSchedules(scheduleId: ID, schedulesIds: [ID]): ScheduleResponse!
    getScheduleOptions: ScheduleOptionsResponse!
    getSchedulesResume: ScheduleResumeResponse!
    getTodaySchedulesResume: ScheduleResumeResponse!
    getSchedulesFromToday: ScheduleResponse!
    getSchedulesRange(startDate: String!, endDate: String!, mySchedules: Boolean): ScheduleResponse!
    getSchedulesResumeRange(startDate: String!, endDate: String!): ScheduleResumeResponse!
    getSchedulesStats(month: Int!): SchedulesStatsResponse!
    getMonthlySchedules(month: Int!,startHour: String!): ScheduleResponse!
    getUserSchedules(userId: ID, past: Boolean): ScheduleResponse!

    #----------------- Poll --------------
    getPolls(pollId: ID, filter: PollFilter): PollResponse!
    getAdminPolls(id: ID): PollResponse!

    #----------------- Plan --------------
    listPlans(onlyActive: Boolean): PlanResponse!
    getPlanByStripeId(stripePriceId: ID): PlanResponse!
    getPlan(planId: ID): PlanResponse!

    #------------------Product------------
    getProducts: ProductResponse!

    #------------------Article------------
    getArticles(limit: Int!, offset: Int!): ArticleResponse!

    #------------------Admin--------------
    getAdminStats: AdminStatsResponse!

    #---------------TrainingTask----------
    getTrainingTasks(userId: String,dateRange: [String]! ): TrainingTaskResponse!

    #-------------------UserWeight--------
    getUserWeights(userId: String, dateRange: [String]): UserWeightResponse!

    #------------------s3-----------------
    getPresignedUrl(key: String ): PresignedUrlResponse!
    
    #--------------StripeCustomer---------
    getCustomer(stripeCustomerId: ID!): StripeCustomerResponse!
    getCustomerByUserId(userId: ID!): StripeCustomerResponse!
    
    #-----------------Payments------------
    listUserPaymentMethods(userId: ID!): PaymentMethodResponse!
    getPaymentMethod(stripePaymentMethodId: ID!): PaymentMethodResponse!
    listPaymentMethods(stripeCustomerId: ID!): PaymentMethodResponse!
    getDefaultPaymentMethod(stripeCustomerId: ID!): PaymentMethodResponse!
    getUserDefaultPaymentMethod(userId: ID!): PaymentMethodResponse!
    getExpiredPaymentMethods(stripeCustomerId: ID!): PaymentMethodResponse!
    getPaymentMethodsStats(stripeCustomerId: ID!): StatsResponse!
    
    #--------------Subscriptions---------
    getSubscription(subscriptionId: ID!): SubscriptionResponse!
    listUserSubscriptions(userId: ID!): SubscriptionResponse!
    getActiveSubscription(userId: ID!): SubscriptionResponse!
    
    #--------------Transactions---------
    getTransaction(transactionId: ID!): TransactionResponse!
    listUserTransactions(userId: ID!, limit: Int): TransactionResponse!
    getTransactionsByStatus(userId: ID!, status: TransactionStatus!, limit: Int): TransactionResponse!
    getSuccessfulTransactions(userId: ID!, limit: Int): TransactionResponse!
    getFailedTransactions(userId: ID!, limit: Int): TransactionResponse!
    getUserTransactionsSummary(userId: ID!): TransactionResponse!

    #--------------Company---------
    getCompanies(companyId: ID, page: Int, query: String): CompanyResponse!
    
}
`;
