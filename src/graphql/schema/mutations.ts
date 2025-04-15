export const graphqlMutations = `   

type Mutation {
    createUser( user: CreateUserInput!): LoginResponse!
    updateUser ( user: UpdateUserInput!, userId: String!): UserResponse!
    forgotPassword(email: String!): String!
    updatePassword(password: UpdatePasswordInput!): UserResponse!
    createMessage(message: CreateMessageInput!): MessageResponse!
    fixMessage(messageId: ID!, fixedEndDate: String!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!
    createSchedule(schedule: CreateScheduleInput!): ScheduleResponse!
    changeScheduleStatus(scheduleId: ID!): ScheduleResponse!
    createPoll(poll: CreatePollInput!): PollResponse!
    createOrChangePollVote(vote: CreatePollVoteInput! ): PollResponse!
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(planId: ID!, plan: CreatePlanInput!): PlanResponse!
    removePlan(planId: ID!): PlanResponse!,
    createSubscription(subscription: CreateSubscriptionInput!): SubscriptionResponse!,
    removeSubscription(planId: ID!): PlanResponse!,
    deletePollVote(pollId: ID!): PollResponse!
    createScheduleDevelopment(scheduleDevelopment: CreateScheduleDevelopmentInput!): ScheduleResponse!
    addUserToSchedule(scheduleId: ID!): ScheduleResponse!
    removeUserFromSchedule(scheduleId: ID!, userId: ID): ScheduleResponse!
    exampleMutation: String!
    createTrainingTask(trainingTask: CreateTrainingTaskInput!): TrainingTaskResponse!
    removeTrainingTask(trainingTaskId: ID!): TrainingTaskResponse!
}

`;
