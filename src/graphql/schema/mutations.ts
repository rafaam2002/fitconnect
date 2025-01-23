export const graphqlMutations = `   

type Mutation {
    createUser ( user: CreateUserInput!): UserResponse
    forgotPassword(email: String!): String!
    changePassword(input: ChangePasswordInput!): String!
    addMessage(message: String!, receiver: ID!, isFixed: Boolean, fixedDuration: Boolean): MessageResponse!
    fixMessage(messageId: ID!, fixedDuration: Int!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!
    addSchedule(startDate: String!, Duration: Int!, maxUsers: Int!, isCancelled: Boolean): ScheduleResponse!
    addScheduleProgrammed(daysOfWeek: [Int], startHour: String!, Duration: Int!, maxUsers: Int!): ScheduleProgrammedResponse!
    cancelSchedule(scheduleId: ID!): ScheduleResponse!
    addPoll(title: String!, options: [String],durationDays: Int): PollResponse!
    addVote(pollId: ID!, option: String!): PollResponse!
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(planId: ID!, plan: CreatePlanInput!): PlanResponse!
    removePlan(planId: ID!): PlanResponse!,
    addSubscription(subscription: CreateSubscriptionInput!): SubscriptionResponse!,
    removeSubscription(planId: ID!): PlanResponse!,
}

`;
