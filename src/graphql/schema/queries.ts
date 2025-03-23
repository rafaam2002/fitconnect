export const graphqlQueries = `
type Query {
    # ----------------- Login ----------------
    login(email: String!, password: String!): LoginResponse!
    loginWithId(id: ID!): LoginResponse!
    # ----------------- User -----------------
    getUsers(filters: [UserFilterInput], and_or: LogicalOperator!): UserResponse!
    me: UserResponse!,
    findUser(id: ID!): UserResponse!
    #otherUser default = 0 (forum) (juan miguel, te parece que el foro tenga id 0? por cierto, en el congelador deje una par de pingas fresquitas para ti)
    #each page will have 50 messages, default = 0 (first page)
    getConversation(otherUserId: ID, page: Int): MessageResponse!
    getNotifications: NotificationResponse!
    getSchedules(scheduleId: ID, calculateIsBooked: Boolean): ScheduleResponse!
    getScheduleOptions: ScheduleOptionsResponse!
    getPolls(pollId: ID): PollResponse!
    getPlans(planId: ID): PlanResponse!
    getSchedulesResume: ScheduleResumeResponse!
    getTodaySchedulesResume: ScheduleResumeResponse!
    getSchedulesFromToday: ScheduleResponse!
    getSchedulesRange(startDate: String!, endDate: String!,calculateIsBooked: Boolean): ScheduleResponse!
    getSchedulesResumeRange(startDate: String!, endDate: String!, calculateIsBooked: Boolean): ScheduleResumeResponse!
    getSchedulesStats(month: Int!): SchedulesStatsResponse!
    #------------------Product-----------------
    getProducts: ProductResponse!
    #------------------Article-----------------
    getArticles(limit: Int!, offset: Int!): ArticleResponse!
    #------------------Admin-----------------
    getAdminStats: AdminStatsResponse!
    
}
`;
