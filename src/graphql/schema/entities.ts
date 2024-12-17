export const graphqlEntities = `
type User {
    id: ID!
    name: String!
    surname: String
    email: String!
    profilePicture: String
    nickname: String
    isActive: Boolean
    isBlocked: Boolean
    rol: UserRolEnum!
}

type Schedule {
    id: ID!
    created_at: String!
    updated_at: String!
    startTime: String!
    Duration: Int!
    maxUsers: Int!
    admin: User!
    isCancelled: Boolean!
    isProgammed: Boolean!
}

type ScheduleProgrammed {
    id: ID!
    created_at: String!
    updated_at: String!
    daysOfWeek: [Int]
    startHour: String!
    Duration: Int!
    maxUsers: Int!
    admin: User!
} 
type Poll {
    id: ID!
    created_at: String!
    updated_at: String!
    title: String!
    description: String!
    options: [PollOptionType]
}

type PollVote { 
    id: ID!
    created_at: String!
    updated_at: String!
    poll: Poll!
    user: User!
    optionSelected: String!
}

type Message {
    id: ID!
    created_at: String!
    text: String!
    isFixed:Boolean
    fixedDuration: Int
    sender: String!
    reciver: String!
}
`;
