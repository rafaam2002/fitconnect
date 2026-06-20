export const graphqlQueries = `
type Query {
    # ── Login ─────────────────────────────────────────────────────────
    login(emailOrNickname: String!, password: String!): LoginResponse!
    loginWithId(id: ID!): LoginResponse!

    # ── User ──────────────────────────────────────────────────────────
    getUsers(query: String, page: Int, roleFilter: [UserRoleEnum], stateFilter: String, filterMe: Boolean, planFilter: PlanFilterInput): UserResponse!
    me: MeResponse
    findUser(id: ID!): UserResponse!
    sendEmailVerification: DefaultResponse!

    # ── Message ───────────────────────────────────────────────────────
    getConversation(otherUserId: ID, page: Int, limit: Int, isForumMessage: Boolean): MessageResponse!
    getNotifications: NotificationResponse!

    # ── Schedule ──────────────────────────────────────────────────────
    getSchedules(scheduleId: ID, schedulesIds: [ID]): ScheduleResponse!
    getScheduleOptions: ScheduleOptionsResponse!
    getSchedulesResume: ScheduleResumeResponse!
    getTodaySchedulesResume: ScheduleResumeResponse!
    getSchedulesFromToday: ScheduleResponse!
    getSchedulesRange(startDate: String!, endDate: String!, mySchedules: Boolean): ScheduleResponse!
    getSchedulesResumeRange(startDate: String!, endDate: String!): ScheduleResumeResponse!
    getSchedulesStats(month: Int!): SchedulesStatsResponse!
    getMonthlySchedules(month: Int!, startHour: String!): ScheduleResponse!
    getUserSchedules(userId: ID, past: Boolean): ScheduleResponse!
    getSchedulesProgrammed(id: ID): ScheduleProgrammedResponse!

    # ── Poll ──────────────────────────────────────────────────────────
    getPolls(pollId: ID, filter: PollFilter): PollResponse!
    getAdminPolls(id: ID): PollResponse!

    # ── Plan ──────────────────────────────────────────────────────────
    listPlans(onlyActive: Boolean, showGlobal: Boolean): PlanResponse!
    getPlan(planId: ID!): PlanResponse!
    getPlansByCompany(companyId: ID!): PlanResponse!

    # ── Product ───────────────────────────────────────────────────────
    getProducts: ProductResponse!

    # ── Article ───────────────────────────────────────────────────────
    getArticles(limit: Int!, offset: Int!): ArticleResponse!

    # ── Admin ─────────────────────────────────────────────────────────
    getAdminStats: AdminStatsResponse!

    # ── TrainingTask ──────────────────────────────────────────────────
    getTrainingTasks(userId: String, dateRange: [String]!, onlyGlobal: Boolean): TrainingTaskResponse!

    # ── UserWeight ────────────────────────────────────────────────────
    getUserWeights(userId: String, dateRange: [String]): UserWeightResponse!

    # ── S3 ────────────────────────────────────────────────────────────
    getPresignedUrl(key: String, command: String): PresignedUrlResponse!

    # ── Customer ──────────────────────────────────────────────────────
    getCustomer(customerId: ID!): CustomerResponse!
    getCustomerByUserId(userId: ID!): CustomerResponse!

    # ── PaymentMethod ─────────────────────────────────────────────────
    listUserPaymentMethods(userId: ID!): PaymentMethodResponse!
    listPaymentMethods(customerId: ID!): PaymentMethodResponse!
    getPaymentMethod(paymentMethodId: ID!): PaymentMethodResponse!
    getDefaultPaymentMethod(customerId: ID!): PaymentMethodResponse!
    getUserDefaultPaymentMethod(userId: ID!): PaymentMethodResponse!
    getExpiredPaymentMethods(customerId: ID!): PaymentMethodResponse!
    getPaymentMethodsStats(customerId: ID!): StatsResponse!

    # ── Subscription ──────────────────────────────────────────────────
    getSubscription(subscriptionId: ID!): SubscriptionResponse!
    listUserSubscriptions(userId: ID!): SubscriptionResponse!
    getActiveSubscription(userId: ID!): SubscriptionResponse!
    getSubscriptionsStats: SubscriptionsStatsResponse!
    getSubscriptionHistory(subscriptionId: ID!): SubscriptionHistoryResponse!

    # ── Pagos ─────────────────────────────────────────────────────────
    """Devuelve el estado de conexión Stripe de una empresa."""
    getPaymentConnectionStatus(companyId: ID!): PaymentConnectionStatusResponse!

    # ── Invoice ───────────────────────────────────────────────────────
    getInvoice(invoiceId: ID!): InvoiceResponse!
    listUserInvoices(userId: ID!): InvoiceResponse!
    getInvoicesBySubscription(subscriptionId: ID!): InvoiceResponse!
    getOverdueInvoices: InvoiceResponse!
    getUpcomingInvoices(userId: ID!): InvoiceResponse!
    getInvoiceStats(userId: ID!): InvoiceStatsResponse!

    # ── Transaction ───────────────────────────────────────────────────
    getTransaction(transactionId: ID!): TransactionResponse!
    listUserTransactions(userId: ID!, limit: Int): TransactionResponse!
    getTransactionsByStatus(userId: ID!, status: TransactionStatus!, limit: Int): TransactionResponse!
    getSuccessfulTransactions(userId: ID!, limit: Int): TransactionResponse!
    getFailedTransactions(userId: ID!, limit: Int): TransactionResponse!
    getUserTransactionsSummary(userId: ID!): TransactionResponse!

    # ── Company ───────────────────────────────────────────────────────
    getCompanies(companyId: ID, page: Int, query: String): CompanyResponse!

    # ── SuperAdmin ────────────────────────────────────────────────────
    getGlobalSystemStats: GlobalSystemStatsResponse!
}
`;
