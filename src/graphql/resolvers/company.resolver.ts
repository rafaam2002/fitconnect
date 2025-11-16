import { GraphQLError } from "graphql";
import {
  ContextProps,
  GetCompanyProps,
  UpdateCompanyPictureProps,
  UpdateCompanyProps,
} from "../../types/resolvers";
import { CustomResponse } from "./errors";
import { Company } from "../../entities/Company";
import { ScheduleOptions } from "../../entities/ScheduleOptions";
import {
  createPictureUrl,
  getPresignedUrl,
} from "../../utils/createPresignedUrls";

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

export const updateCompanyLogo = async (
  _: any,
  args: UpdateCompanyPictureProps,
  context: ContextProps
) => {
  const { companyId, picture } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (currentUser.currentCompany.id !== companyId) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const companyRepo = em.getRepository(Company);
  const updateCompany: Company = await companyRepo.findOne({ id: companyId });

  if (!updateCompany) {
    return CustomResponse(404, "Company not found");
  }

  if (!updateCompany.logo) {
    const pictureUrl = await createPictureUrl(
      em,
      {
        id: companyId,
        name: picture,
        type: "companyLogo",
      },
      await getPresignedUrl(picture)
    );
    updateCompany.logo = pictureUrl;
  } else {
    //updateUser.pictureUrl.name = picture;
    updateCompany.logo.url = await getPresignedUrl(picture);
  }
  try {
    await em.persistAndFlush(updateCompany);

    return CustomResponse(200, "Company updated successfully", true, {
      company: updateCompany,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error updating company", false, {
      company: null,
    });
  }
};

export const companyResolvers = {
  Query: {
    getCompanies,
  },
  Mutation: {
    updateCompany,
    updateCompanyLogo,
  },
  
};


