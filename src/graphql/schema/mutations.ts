export const graphqlMutations = `   

type Mutation {
    createUser ( user: CreateUserInput!): UserResponse
    forgotPassword(email: String!): String!
    changePassword(currentPassword: String!, newPassword: String!): UserResponse!
    createMessage(text: String!, receiverId: ID!, isFixed: Boolean, fixedDuration: Boolean): MessageResponse!
    fixMessage(messageId: ID!, fixedDuration: Int!): MessageResponse!
    unfixMessage(messageId: ID!): MessageResponse!
    createSchedule(startDate: String!, endDate: String!, maxUsers: Int!, isCancelled: Boolean): ScheduleResponse!
    createScheduleProgrammed(daysOfWeek: [Int], startHour: String!, Duration: Int!, maxUsers: Int!): ScheduleProgrammedResponse!
    cancelSchedule(scheduleId: ID!): ScheduleResponse!
    createPoll(title: String!, options: [String]!,durationDays: Int!): PollResponse!
    createVote(pollId: ID!, option: String!): PollResponse!
    createPlan(plan: CreatePlanInput!): PlanResponse!
    updatePlan(planId: ID!, plan: CreatePlanInput!): PlanResponse!
    removePlan(planId: ID!): PlanResponse!,
    createSubscription(subscription: CreateSubscriptionInput!): SubscriptionResponse!,
    removeSubscription(planId: ID!): PlanResponse!,
}

`;
