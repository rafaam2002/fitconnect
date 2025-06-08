export const graphqlMutations = `   

type Mutation {
    #------------------User-----------------
    createUser( user: CreateUserInput!): LoginResponse!
    updateUser ( user: UpdateUserInput!, userId: String!): UserResponse!
    forgotPassword(email: String!): String!
    updatePassword(password: UpdatePasswordInput!): UserResponse!
    updateUserPicture(picture: String!, userId: String!): UserResponse!

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

    #------------------Plan--------------------------
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(planId: ID!, plan: CreatePlanInput!): PlanResponse!
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

    #-----------------Token---------------------
    registerToken(token: String!): RegisterTokenResponse!
    sendNotification(notification: SendNotificationInput!): SendNotificationResponse!
}

`;
