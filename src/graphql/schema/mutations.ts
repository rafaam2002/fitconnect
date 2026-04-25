export const graphqlMutations = `   
type Mutation {
    #------------------User--------------------
    setActiveCompany(companyId: ID!): MeResponse,
    createUser( user: CreateUserInput!, company: CreateCompanyInput): LoginResponse
    updateUser ( user: UpdateUserInput!): UserResponse!
    forgotPassword(email: String!): String!
    updatePassword(password: UpdatePasswordInput!): UserResponse!
    updateUserPicture(picture: String!, userId: String!): UserResponse!
    deleteUser(id: ID!): DefaultResponse!
    loginWithGoogle(id_token: String!): LoginResponse!
    sendChangePasswordEmail(email: String!): DefaultResponse!
    sendTestNotification: DefaultResponse!

    #------------------Permission-----------------
    syncPermissions: DefaultResponse!

    #------------------Message-----------------
    createMessage(message: CreateMessageInput!): MessageResponse!
    fixMessage(messageId: ID!, fixedEndDate: String!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!

    #------------------Schedule-----------------
    removeSchedule(scheduleId: ID!): ScheduleResponse!
    createSchedule(schedule: CreateScheduleInput!): ScheduleResponse!
    changeScheduleStatus(scheduleId: ID!): ScheduleResponse!
    createScheduleDevelopment(scheduleDevelopment: CreateScheduleDevelopmentInput!): ScheduleResponse!
    addUserToSchedule(scheduleId: ID!): ScheduleResponse!
    removeUserFromSchedule(scheduleId: ID!, userId: ID): ScheduleResponse!
    updateScheduleOptions(scheduleOptions: UpdateScheduleOptionsInput!): ScheduleOptionsResponse!
    updateSchedule(schedule: UpdateScheduleInput!): ScheduleResponse!
    updateScheduleProgrammed(scheduleProgrammed: UpdateScheduleProgrammedInput!): ScheduleProgrammedResponse!
    deleteScheduleProgrammed(ids: [ID]!): ScheduleProgrammedResponse!

    #------------------Poll---------------------
    createPoll(poll: CreatePollInput!): PollResponse!
    createOrChangePollVote(vote: CreatePollVoteInput! ): PollResponse!
    deletePollVote(pollId: ID!): PollResponse!
    removePolls(ids: [String]!): PollResponse!

    #------------------Plan--------------------
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(plan: CreatePlanInput!): PlanResponse!
    removePlan(planId: ID!): PlanResponse!,

    #------------------Subscription-------------
    createSubscription(subscription: CreateSubscriptionInput!): SubscriptionResponse!
    updateSubscription(subscription: UpdateSubscriptionInput!): SubscriptionResponse!
    cancelSubscription(input: CancelSubscriptionInput): SubscriptionResponse!
    pauseSubscription(subscriptionId: ID!): SubscriptionResponse!
    resumeSubscription(subscriptionId: ID!): SubscriptionResponse!
    removeSubscription(planId: ID!): PlanResponse!
    changeSubscriptionPlan(subscriptionId: ID!, newPlanId: ID!): SubscriptionResponse!

    #---------------TrainingTask---------------
    createTrainingTask(trainingTask: CreateTrainingTaskInput!): TrainingTaskResponse!
    removeTrainingTasks(ids: [ID]!): TrainingTaskResponse!

    #----------------UserWeight----------------
    addUserWeight(userWeight: AddUserWeightInput!): UserWeightResponse!
    removeUserWeights(ids: [ID]!): UserWeightResponse!

    #-----------------Product------------------
    createProduct(product: CreateProductInput!): ProductResponse!
    updateProductPicture(imageName: String!, productId: String!): ProductResponse!
    removeProduct(ids: [String]!): ProductResponse!

    #-----------------Token--------------------
    registerToken(token: String!): RegisterTokenResponse!
    removePushToken(token: String!): DefaultResponse!
    sendNotification(notification: SendNotificationInput!): SendNotificationResponse!
    refreshAccessToken(inputToken: String!): LoginResponse!
    
    #-----------------PaymentMethod------------
    createSetupIntent(stripeCustomerId: String!, usage: String): SetupIntentResponse!
    confirmSetupIntent(setupIntentId: String!, setAsDefault: Boolean): PaymentMethodResponse!
    attachPaymentMethod(input: AttachPaymentMethodInput!): AttachPaymentMethodResponse!
    removePaymentMethod(paymentId: ID!): PaymentMethodResponse!
    setDefaultPaymentMethod(paymentMethodId: ID!): PaymentMethodResponse!
    updatePaymentMethodMetadata(paymentMethodId: ID!, metadata: JSON): PaymentMethodResponse!
    markPaymentMethodAsExpired(paymentMethodId: ID!): PaymentMethodResponse!
    cleanupExpiredPaymentMethods(stripeCustomerId: ID!): PaymentMethodResponse!
    validatePaymentMethod(paymentMethodId: ID!): PaymentMethodResponse!
    
    #----------------StripeCustomer-------------
    createCustomer(customer: CreateCustomerInput!): StripeCustomerResponse!
    updateCustomer(customer: UpdateCustomerInput!): StripeCustomerResponse!
    deactivateCustomer(stripeCustomerId: ID!): StripeCustomerResponse!
    
    #----------------Transactions---------------
    createCharge(input: CreateChargeInput!): TransactionResponse!
    refundTransaction(input: RefundTransactionInput!): TransactionResponse!
    retryFailedTransaction(transactionId: ID!): TransactionResponse!
    markTransactionAsReconciled(transactionId: ID!): TransactionResponse!

    #----------------Company-------------------
    updateCompany(companyId: ID!, companyData: CompanyDataInput! scheduleOptions: ScheduleOptionsInput!): CompanyResponse!
    updateCompanyLogo(companyId: ID!, picture: String!): CompanyResponse!
    createCompany(company: CreateCompanyInput!): MeResponse!
    requestJoinCompany(companyId: ID!): DefaultResponse!
    admitUserToCompany(companyId: ID!, userId: ID!, role: UserRoleEnum): DefaultResponse!
}

`;
