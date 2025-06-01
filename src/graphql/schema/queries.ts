export const graphqlQueries = `
type Query {
    # ----------------- Login ----------------
    login(email: String!, password: String!): LoginResponse!
    loginWithId(id: ID!): LoginResponse!

    # ----------------- User -----------------
    getUsers(textFilter: String, page: Int, rolFilter: [UserRol]): UserResponse!
    me: UserResponse!,
    findUser(id: ID!): UserResponse!
    #otherUser default = 0 (forum) (juan miguel, te parece que el foro tenga id 0? por cierto, en el congelador deje una par de pingas fresquitas para ti)
    #each page will have 50 messages, default = 0 (first page)

    # ----------------- Message -----------------
    getConversation(otherUserId: ID, page: Int, limit: Int): MessageResponse!
    getNotifications: NotificationResponse!

    # ----------------- Schedule -----------------
    getSchedules(scheduleId: ID, schedulesIds: [ID]): ScheduleResponse!
    getScheduleOptions: ScheduleOptionsResponse!
    getSchedulesResume: ScheduleResumeResponse!
    getTodaySchedulesResume: ScheduleResumeResponse!
    getSchedulesFromToday: ScheduleResponse!
    getSchedulesRange(startDate: String!, endDate: String!, mySchedules: Boolean): ScheduleResponse!
    getSchedulesResumeRange(startDate: String!, endDate: String!): ScheduleResumeResponse!
    getSchedulesStats(month: Int!): SchedulesStatsResponse!
    getMonthlySchedules(month: Int!,startHour: String!): ScheduleResponse!

    #----------------- Poll ----------------------
    getPolls(pollId: ID, filter: PollFilter): PollResponse!

    #----------------- Plan ----------------------
    getPlans(planId: ID): PlanResponse!

    #------------------Product-----------------
    getProducts: ProductResponse!

    #------------------Article-----------------
    getArticles(limit: Int!, offset: Int!): ArticleResponse!

    #------------------Admin-----------------
    getAdminStats: AdminStatsResponse!

    #-------------------TrainingTask-----------------
    getTrainingTasks(userId: String,dateRange: [String]! ): TrainingTaskResponse!

    #-------------------UserWeight-----------------
    getUserWeights(userId: String, dateRange: [String]): UserWeightResponse!

    #------------------s3-----------------
    getPresignedUrl(key: String ): PresignedUrlResponse!
    
}
`;
