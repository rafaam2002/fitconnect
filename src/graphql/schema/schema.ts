import { graphqlEntities } from "./entities";
import { graphqlEnums } from "./enums";
import { graphqlInputs } from "./inputs";
import { graphqlMutations } from "./mutations";
import { graphqlQueries } from "./queries";
import { graphqlResponses } from "./responses";
import { graphqlSubscriptions } from "./subscriptions";
export const typeDefs = `#graphql

${graphqlEnums}

type Tokens {
    token: String
    refreshToken: String
}

${graphqlEntities}

${graphqlResponses}

${graphqlInputs}

${graphqlQueries}

${graphqlMutations}

${graphqlSubscriptions}
`;
