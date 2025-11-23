import { EntityManager } from "@mikro-orm/core";
import { authenticateUser } from "./auth";
import { GraphQLError } from "graphql";

export const middleware = async (em: EntityManager, authorization?: string, companyId?: string) => {
    const currentUser = await authenticateUser(em, authorization);
    //if(token.companyId !== currentUser.contextCompanyId) throw new Error("Token companyId does not match user's company context")

    if (currentUser && currentUser.activeCompanyId && currentUser.activeCompanyId !== companyId) {
        throw new GraphQLError("User is logged in two companies at the same time", {
            extensions: {
                code: "USER_LOGGED_IN_TWO_COMPANIES",
                http: { status: 401 },
            },
        });
    } else if (companyId) {
        em.setFilterParams("companyContext", {
            companyId
        });
    }
    return { em, currentUser };
}