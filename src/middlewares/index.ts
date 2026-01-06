import { EntityManager } from "@mikro-orm/core";
import { GraphQLError } from "graphql";
import { authenticateUser } from "./auth";

export const middleware = async (
  em: EntityManager,
  authorization?: string,
  companyId?: string,
  isSetCompanyMe?: boolean
) => {
  const currentUser = await authenticateUser(em, authorization);
  //if(token.companyId !== currentUser.contextCompanyId) throw new Error("Token companyId does not match user's company context")

   if (isSetCompanyMe) {
    em.setFilterParams("companyContext", {
      companyId,
    });
  } else if (currentUser?.activeCompanyId) {
    if (currentUser.activeCompanyId !== companyId) {
      throw new GraphQLError(
        "User is logged in two companies at the same time",
        {
          extensions: {
            code: "USER_LOGGED_IN_TWO_COMPANIES",
            http: { status: 401 },
          },
        }
      );
    }
    em.setFilterParams("companyContext", {
      companyId: currentUser.activeCompanyId,
    });
  }
  return { em, currentUser };
};
