import { graphqlEntities } from "./entities";
import { graphqlEnums } from "./enums";
import { graphqlInputs } from "./inputs";
import { graphqlMutations } from "./mutations";
import { graphqlQueries } from "./queries";
import { graphqlResponses } from "./responses";
import { graphqlTypes } from "./types";
export const typeDefs = `#graphql

${graphqlEnums}

type Tokens {
    token: String
    refeshToken: String
}

${graphqlEntities}

${graphqlResponses}

${graphqlInputs}

type MessagesReceived implements BasicResponse{
    code: String!
    success: Boolean!
    message: String!
    messages: [Message]
}

${graphqlQueries}

${graphqlMutations}
`;
