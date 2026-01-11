import { ContextProps } from '../../types/resolvers';
import { CompanyService } from '../../services/company.service';
import { handleError } from '../../utils/errors.util';

// ============= QUERY RESOLVERS =============

export const getCompanies = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId, page, query } = args;

    const companyService = new CompanyService(em);
    return await companyService.getCompanies(
      currentUser,
      companyId,
      page,
      query
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ============= MUTATION RESOLVERS =============

export const updateCompany = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId, companyData, scheduleOptions } = args;

    const companyService = new CompanyService(em);
    return await companyService.updateCompany(
      currentUser,
      companyId,
      companyData,
      scheduleOptions
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateCompanyLogo = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId, picture } = args;

    const companyService = new CompanyService(em);
    return await companyService.updateCompanyLogo(
      currentUser,
      companyId,
      picture
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const createCompany = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const companyService = new CompanyService(em);
    return await companyService.createCompany(currentUser, args);
  } catch (error: any) {
    return handleError(error);
  }
};

export const requestJoinCompany = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId } = args;

    const companyService = new CompanyService(em);
    return await companyService.requestJoinCompany(currentUser, companyId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const admitUserToCompany = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId, userId } = args;

    const companyService = new CompanyService(em);
    return await companyService.admitUserToCompany(
      currentUser,
      companyId,
      userId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ============= RESOLVER EXPORT =============

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
