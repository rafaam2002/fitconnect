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
    name: String,
    surname: String,
    email: String!,
    phoneNumber: String,
    nickname: String!,
    isBlocked: Boolean,
    role: UserRole,
}

input CreateUserInput {
    email: String!,
    nickname: String!,
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
    age: Int,
    type: ScheduleType!,
    startDate: String!,
    endDate: String!,
    maxUsers: Int!,
    repeatDays: [Int],
    admin: ID!,
}

input UpdateScheduleOptionsInput {
    maxActiveReservations: Int!,
    maxAdvanceBookingDays: Int!,
    sameDayBookingAllowed: Boolean!,
    fullOpenHours: Int!,
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

input CreateSubscriptionInput {
    planId: ID!
    userId: ID!
    paymentMethodId: ID
    trialPeriodDays: Int
    quantity: Int
    metadata: JSON
}

input UpdateSubscriptionInput {
    subscriptionId: ID!
    planId: ID!
    paymentMethodId: ID
    quantity: Int
    metadata: JSON
}

input CancelSubscriptionInput {
    subscriptionId: String,
    cancelAtPeriodEnd: Boolean
    cancellationReason: String
}

input SendNotificationInput {
    title: String!
    body: String!
    forAll: Boolean!
}

input CreatePaymentMethodInput {
    stripeCustomerId: String!
    type: PaymentMethodType!
    card: CardInput
    setAsDefault: Boolean
}

input CreateCustomerInput {
    userId: ID!
    email: String
    name: String
    phoneNumber: String
}

input UpdateCustomerInput {
    stripeCustomerId: ID!
    email: String
    name: String
    phoneNumber: String
}

input CreatePlanInput {
    id: ID
    name: String
    description: String
    amount: Float
    currency: Currency
    interval: PlanInterval
    intervalCount: Int
    trialPeriodDays: Int
    features: [String]
    status: PlanStatus
}

input CardInput {
    number: String!
    exp_month: Int!
    exp_year: Int!
    cvc: String!
}

input AttachPaymentMethodInput {
    paymentMethodId: ID!
    stripeCustomerId: ID!
    setAsDefault: Boolean
}

input CreateChargeInput {
    userId: ID!
    amount: Int
    currency: Currency
    paymentMethodId: ID
    description: String
    metadata: JSON  
}

input RefundTransactionInput {
    transactionId: ID!
    amount: Float
    reason: String
    metadata: JSON
}
`;
