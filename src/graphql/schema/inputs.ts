export const graphqlInputs = `
input UpdateUserInput {
    name: String!,
    surname: String!,
    email: String!,
    phoneNumber: String,
    nickname: String!,
    profilePicture: String,
    rol: UserRol
}

input UserFilterInput {
    name: String,
    surname: String,
    email: String,
    phoneNumber: String,
    nickname: String,
    rol: UserRol
    isActive: Boolean
}

input CreateUserInput {
    name: String!
    surname: String!
    email: String!
    password: String!
    nickname: String!
    profilePicture: String
    rol: UserRol
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

input CreatePollInput {
    title: String!,
    options: [String]!,
    durationDays: Int!
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
    paymentType: PaymentType!
}

input CreateSubscriptionInput {
    paymentMethod: PaymentMethod
    cardId: ID!
    planId: ID!
    applePayToken: String
    googlePayToken: String
}
`;
