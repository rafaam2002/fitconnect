import { GraphQLError } from "graphql";
import { ContextProps, GetCompanyProps } from "../../types/resolvers";
import { CustomResponse } from "./errors";

export const getCompanies = async (
  _: any,
  { companyId }: GetCompanyProps,
  { em, currentUser }: ContextProps
) => {
  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (companyId) {
    const company = await em.findOne("Company", { id: companyId });
    if (!company) {
      return CustomResponse(404, "Company not found");
    }
    return CustomResponse(200, "Company fetched successfully", true, {
      company,
    });
  } else {
    const companies = await em.find("Company", {});

    return CustomResponse(200, "Companies fetched successfully", true, {
      companies,
    });
  }
};
export const companyResolvers = {
  Query: {
    getCompanies,
  },
  Mutation: {},
};
