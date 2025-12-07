import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Company } from "../../entities/Company";
import { ScheduleOptions } from "../../entities/ScheduleOptions";
import { User } from "../../entities/User";
import { UserRole } from "../../entities/UserRole";
import { UserRoleEnum } from "../../types/enums";
import {
  CompanyProps,
  ContextProps,
  GetCompanyProps,
  UpdateCompanyPictureProps,
  UpdateCompanyProps,
} from "../../types/resolvers";
import { createAdminCompany } from "../../utils/company";
import { companyVerificationEmailHtml } from "../../utils/companyVerificationEmailHtml ";
import { sendPushNotification } from "../../utils/notifications";
import { createPictureUrl, getPresignedUrl } from "../../utils/presigned-urls";
import { CustomResponse } from "./errors";

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
        filters: false,
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
      filters: false,
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

  if (currentUser.activeCompanyId !== companyId) {
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
    { populate: ["companies"] }
  );
  try {
    const {
      newCompany,
      newUser: newAdminUser,
      newFirstForumMessage,
      newScheduleOptions,
    } = createAdminCompany(em, user, company);

    await em.persistAndFlush([
      newCompany,
      newFirstForumMessage,
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

export const requestJoinCompany = async (
  _: any,
  { companyId }: { companyId: string },
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

  const company = await em.findOne(Company, { id: companyId }, {
    filters: false,
  });
  if (!company) {
    return CustomResponse(404, "Company not found");
  }

  const user = await em.findOne(
    User,
    { id: currentUser.id },
    {
      populate: ["companies", "pendingCompanies"],
      filters: false,
    }
  );
  if (!user) {
    return CustomResponse(404, "User not found");
  }

  // Check if user is already in the company or pending
  const isMember = await user.companies.contains(company);
  const isPending = await user.pendingCompanies.contains(company);

  if (isMember) {
    return CustomResponse(400, "User is already a member of this company");
  }

  if (isPending) {
    return CustomResponse(400, "User request is already pending");
  }

  user.pendingCompanies.add(company);
  await em.persistAndFlush(user);

  // Send notification to BOSS users
  try {
    const bossRoles = await em.find(
      UserRole,
      {
        company: company.id,
        role: UserRoleEnum.BOSS,
      },
      { populate: ["user.pushTokens"] }
    );

    for (const role of bossRoles) {
      const boss = role.user;
      if (boss && boss.pushTokens) {
        for (const tokenEntity of boss.pushTokens) {
          await sendPushNotification(
            tokenEntity.token,
            "Nueva solicitud de unión",
            `${user.fullName || user.nickname} quiere unirse a ${company.name}`,
            { type: "join_request", userId: user.id, companyId: company.id }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }

  return CustomResponse(200, "Request sent successfully", true);
};

export const admitUserToCompany = async (
  _: any,
  { companyId, userId }: { companyId: string; userId: string },
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

  const company = await em.findOne(Company, { id: companyId });
  if (!company) {
    return CustomResponse(404, "Company not found");
  }

  // Verify current user is BOSS of the company
  const currentUserRole = await em.findOne(UserRole, {
    user: currentUser.id,
    company: company.id,
    role: UserRoleEnum.BOSS,
  });

  if (!currentUserRole) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  const userToAdmit = await em.findOne(
    User,
    { id: userId },
    { populate: ["pushTokens","pendingCompanies"] }
  );
  if (!userToAdmit) {
    return CustomResponse(404, "User to admit not found");
  }

  // Check if user is in pending list
  const isPending = await userToAdmit.pendingCompanies.contains(company);
  if (!isPending) {
    return CustomResponse(400, "User is not in the pending list");
  }

  // Move user from pending to members
  userToAdmit.pendingCompanies.remove(company);
  userToAdmit.companies.add(company);

  // Create UserRole for the new member (default to STANDARD)
  const newUserRole = new UserRole(userToAdmit, company, UserRoleEnum.STANDARD);
  em.persist(newUserRole);

  await em.persistAndFlush(userToAdmit);

  // Send notification to the admitted user
  try {
    if (userToAdmit.pushTokens) {
      for (const tokenEntity of userToAdmit.pushTokens) {
        await sendPushNotification(
          tokenEntity.token,
          "Solicitud aceptada",
          `Has sido aceptado en ${company.name}`,
          { type: "company_admission", companyId: company.id }
        );
      }
    }
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }

  return CustomResponse(200, "User admitted successfully", true);
};

export const companyResolvers = {
  Query: {
    getCompanies,
  },
  Mutation: {
    updateCompany,
    updateCompanyLogo,
    createCompany,
    requestJoinCompany,
    admitUserToCompany,
  },
};
