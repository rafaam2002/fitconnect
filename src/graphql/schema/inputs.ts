export const graphqlInputs = `
input UserInput{
    name: String!
    surname: String!
    password: String!
    email: String!
    nickname: String!
}

input CreateUserInput {
    name: String!
    surname: String!
    email: String!
    password: String!
    nickname: String
    profilePicture: String
    rol: UserRolEnum
}
    
input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
}

input FinPlanInput {
    planId: ID!
}

input CreatePlanInput {
    name: String!
    description: String!
    price: Float!
    durationInDays: Int!
    isActive: Boolean!
    currency: String
}
`;
