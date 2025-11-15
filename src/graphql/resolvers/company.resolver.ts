import { GraphQLError } from "graphql";
import {
  ContextProps,
  GetCompanyProps,
  UpdateCompanyProps,
} from "../../types/resolvers";
import { CustomResponse } from "./errors";
import { Company } from "../../entities/Company";
import { ScheduleOptions } from "../../entities/ScheduleOptions";

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
    const company: Company = await em.findOne(
      Company,
      { id: companyId },
      {
        populate: ["scheduleOptions"],
      }
    );
    if (!company) {
      return CustomResponse(404, "Company not found");
    }
    return CustomResponse(200, "Company fetched successfully", true, {
      company,
    });
  } else {
    const companies: Company[] = await em.find(
      Company,
      {},
      {
        populate: ["scheduleOptions"],
      }
    );

    return CustomResponse(200, "Companies fetched successfully", true, {
      companies,
    });
  }
};

export const updateCompany = async (
  _: any,
  { companyId, companyData, scheduleOptions }: UpdateCompanyProps,
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

  const company: Company = await em.findOne(
    Company,
    { id: companyId },
    {
      populate: ["scheduleOptions"],
    }
  );
  if (!company) {
    return CustomResponse(404, "Company not found");
  }

  Object.assign(company, companyData);
  if (company.scheduleOptions)
    Object.assign(company.scheduleOptions, scheduleOptions);
  else {
    const newScheduleOptions = em.create(ScheduleOptions, {
      ...scheduleOptions,
      company: company,
    });
    company.scheduleOptions = newScheduleOptions;
  }
  await em.persistAndFlush(company);

  return CustomResponse(200, "Company updated successfully", true, {
    company,
  });
};

export const companyResolvers = {
  Query: {
    getCompanies,
  },
  Mutation: {
    updateCompany,
  },
};
