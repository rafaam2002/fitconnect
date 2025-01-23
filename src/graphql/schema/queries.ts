export const graphqlQueries = `
type Query {
    # ----------------- Login ----------------
    login(email: String!, password: String!): LoginResponse!
    loginWithId(id: ID!): LoginResponse!
    # ----------------- User -----------------
    allUsers: UserResponse!
    me: UserResponse!,
    findUser(id: ID!): UserResponse!
    #otherUser default = 0 (forum) (juan miguel, te parece que el foro tenga id 0? por cierto, en el congelador deje una par de pingas fresquitas para ti)
    #each page will have 50 messages, default = 0 (first page)
    getConversation(otherUserId: ID, page: Int): MessageResponse!
    getNotifications: NotificationResponse!
    getSchedules: ScheduleResponse!
    getSchedules_option: [ScheduleOptionResponse]!
    getPolls(pollId: ID): PollResponse!,
    getPlans(planId: ID): PlanResponse!,
}
`;
