import { GraphQLError } from "graphql";
import {
  CompanyProps,
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
import { createAdminCompany } from "../../utils/company";
import { User } from "../../entities/User";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { companyVerificationEmailHtml } from "../../utils/companyVerificationEmailHtml ";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // tu email
    pass: process.env.GMAIL_APP_PASS, // password o app password
  },
});

export const getCompanies = async (
  _: any,
  { companyId, page, query }: GetCompanyProps,
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
    const pageNumber = page || 1;
    const limit = 10;
    const offset = (pageNumber - 1) * limit;

    let where = {};
    if (query) {
      where = {
        $or: [{ name: { $ilike: `%${query}%` } }],
      };
    }

    const [companies, totalItems] = await em.findAndCount(Company, where, {
      limit,
      offset,
      populate: ["scheduleOptions"],
    });

    const totalPages = Math.ceil(totalItems / limit);

    return CustomResponse(200, "Companies fetched successfully", true, {
      companies,
      totalItems,
      totalPages,
      currentPage: pageNumber,
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

export const createCompany = async (
  _: any,
  company: CompanyProps,
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
  const user = await em.findOne(
    User,
    { id: currentUser.id },
    { populate: ["memberships"] }
  );
  try {
    const {
      newCompany,
      newUser: newAdminUser,
      newFirstForumMessage,
      newMembership,
      newScheduleOptions,
    } = createAdminCompany(em, user, company);

    await em.persistAndFlush([
      newCompany,
      newFirstForumMessage,
      newMembership,
      newScheduleOptions,
      newAdminUser,
    ]);

    const companyTk = jwt.sign({ id: newCompany.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "Confirma tu cuenta",
      html: companyVerificationEmailHtml(companyTk, company, user),
    });

    return CustomResponse(201, "Company created successfully", true, {
      company: newCompany,
      user: newAdminUser,
    });
  } catch (error) {
    console.error(error);
    return CustomResponse(500, "Error creating company" + error.message);
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
