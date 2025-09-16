export const graphqlMutations = `   
type Mutation {
    #------------------User-----------------
    createUser( user: CreateUserInput!): LoginResponse!
    updateUser ( user: UpdateUserInput!, userId: String!): UserResponse!
    forgotPassword(email: String!): String!
    updatePassword(password: UpdatePasswordInput!): UserResponse!
    updateUserPicture(picture: String!, userId: String!): UserResponse!
    loginWithGoogle(id_token: String!): LoginResponse!
    sendChangePasswordEmail(email: String!): DefaultResponse!

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

    #------------------Poll--------------------------
    createPoll(poll: CreatePollInput!): PollResponse!
    createOrChangePollVote(vote: CreatePollVoteInput! ): PollResponse!
    deletePollVote(pollId: ID!): PollResponse!
    removePolls(ids: [String]!): PollResponse!

    #------------------Plan--------------------------
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(plan: CreatePlanInput!): PlanResponse!
    removePlan(planId: ID!): PlanResponse!,

    #------------------Subscription-----------------
    createSubscription(subscription: CreateSubscriptionInput!): SubscriptionResponse!,
    removeSubscription(planId: ID!): PlanResponse!,

    #------------------TrainingTask-----------------
    createTrainingTask(trainingTask: CreateTrainingTaskInput!): TrainingTaskResponse!
    removeTrainingTask(trainingTaskId: ID!): TrainingTaskResponse!

    #------------------UserWeight------------------
    addUserWeight(userWeight: AddUserWeightInput!): UserResponse!
    removeUserWeight(userWeightId: ID!): UserResponse!

    #------------------Product------------------
    createProduct(product: CreateProductInput!): ProductResponse!
    updateProductPicture(imageName: String!, productId: String!): ProductResponse!
    removeProduct(ids: [String]!): ProductResponse!

    #-----------------Token-----
    registerToken(token: String!): RegisterTokenResponse!
    removePushToken(token: String!): DefaultResponse!
    sendNotification(notification: SendNotificationInput!): SendNotificationResponse!
    refreshToken(refreshToken: String!): LoginResponse!
    
    #-----------------PaymentMethod--------------------------
    createSetupIntent(stripeCustomerId: String!, usage: String): SetupIntentResponse!
    confirmSetupIntent(setupIntentId: String!, setAsDefault: Boolean): PaymentMethodResponse!
    attachPaymentMethod(input: AttachPaymentMethodInput!): AttachPaymentMethodResponse!
    removePaymentMethod(paymentId: ID!): PaymentMethodResponse!
    setDefaultPaymentMethod(paymentMethodId: ID!): PaymentMethodResponse!
    updatePaymentMethodMetadata(paymentMethodId: ID!, metadata: JSON): PaymentMethodResponse!
    markPaymentMethodAsExpired(paymentMethodId: ID!): PaymentMethodResponse!
    cleanupExpiredPaymentMethods(stripeCustomerId: ID!): PaymentMethodResponse!
    validatePaymentMethod(paymentMethodId: ID!): PaymentMethodResponse!
    
    #------------------------StripeCustomer-------------------------
    createCustomer(customer: CreateCustomerInput!): StripeCustomerResponse!
    updateCustomer(customer: UpdateCustomerInput!): StripeCustomerResponse!
    deactivateCustomer(stripeCustomerId: ID!): StripeCustomerResponse!
    
}

`;

