export const graphqlMutations = `   

type Mutation {
    createUser( user: CreateUserInput!): LoginResponse!
    updateUser ( user: UpdateUserInput!): UserResponse!
    forgotPassword(email: String!): String!
    updatePassword(password: UpdatePasswordInput!): UserResponse!
    createMessage(message: CreateMessageInput!): MessageResponse!
    fixMessage(messageId: ID!, fixedDuration: Int!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!
    createSchedule(schedule: CreateScheduleInput!): ScheduleResponse!
    createScheduleProgrammed(scheduleProgrammed: CreateScheduleProgrammedInput!): ScheduleProgrammedResponse!
    cancelSchedule(scheduleId: ID!): ScheduleResponse!
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
    removeUserFromSchedule(scheduleId: ID!): ScheduleResponse!
    exampleMutation: String!
}

`;
