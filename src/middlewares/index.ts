import { EntityManager } from "@mikro-orm/core";
import { authenticateUser } from "./auth";

export const middleware = async (em: EntityManager, authorization?: string, companyId?: string) => {
    const currentUser = await authenticateUser(em, authorization);
    //if(token.companyId !== currentUser.contextCompanyId) throw new Error("Token companyId does not match user's company context")

    if (currentUser && currentUser.contextCompanyId) {
        //IMPORTANTE!!: si usuario logeado, por defecto solo se usaran usuarios de la misma compania
        em.setFilterParams("companyContext", {
            companyId: currentUser.contextCompanyId,
        });
    } else if (companyId) {
        em.setFilterParams("companyContext", {
            companyId
        });
    }
    return { em, currentUser };
}