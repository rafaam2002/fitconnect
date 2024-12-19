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
}
    
input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
}
`;