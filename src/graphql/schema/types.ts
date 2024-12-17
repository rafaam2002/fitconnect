export const graphqlTypes = `

type PollAndVotesType {
    poll: Poll!
    votes: [PollVote]
}
type PollOptionType {
    option: String!
    votes: Int!
}
`;
