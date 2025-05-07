export const graphqlInputs = `

input CreateProductInput {
    name: String!,
    description: String!,
    price: Float!,
}

input AddUserWeightInput {
    userId: ID!,
    weight: Float!,
    date: String!
}

input CreateTrainingTaskInput {
    content: String!,
    userId: ID,
    date: String!,
    repeat: Boolean!
}

input UpdateUserInput {
    name: String!,
    surname: String!,
    email: String!,
    phoneNumber: String,
    nickname: String!,
    isBlocked: Boolean,
    rol: UserRol,
}

input CreateUserInput {
    name: String!
    surname: String!
    nickname: String!
    password: String!
}

input CreatePollVoteInput {
    pollId: ID!,
    option: Int!
}

input UpdatePasswordInput {
    currentPassword: String!,
    newPassword: String!,
    confirmPassword: String!
}

input CreateScheduleInput {
    title: String!,
    description: String!,
    startDate: String!,
    endDate: String!,
    maxUsers: Int!,
    repeatDays: [Int]!,
}

input CreateScheduleDevelopmentInput {
    title: String!,
    startTime: String,
    endTime: String,
    maxUsers: Int!,
    state: ScheduleState,
}

input PollFilter {
    since: String!,
}


input CreatePollInput {
    title: String!,
    options: [String]!,
    endDate: String!
}

input CreateMessageInput {
    text: String!,
    receiverId: ID!,
    isFixed: Boolean,
    fixedDuration: Boolean
}

input UserInput{
    name: String!
    surname: String!
    password: String!
    email: String!
    nickname: String!
}

input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
}

input FindPlanInput {
    planId: ID!
}

input CreatePlanInput {
    name: String!
    description: String!
    price: Float!
    durationInDays: Int!
    isActive: Boolean!
    currency: String
    paymentType: PaymentType!,
    icon: String
    features: [String]!
    isBestChoice: Boolean
}

input CreateSubscriptionInput {
    paymentMethod: PaymentMethod
    cardId: ID!
    planId: ID!
    applePayToken: String
    googlePayToken: String
}
`;
