import { Company } from '../../entities/Company';
import { User } from '../../entities/User';
import { ContextProps } from '../../types/resolvers';
import { createServiceResponse } from '../../utils/errors.util';
import { wrapWithGlobalContext } from '../middlewares/filters';

const getGlobalSystemStats = async (_: any, __: any, context: ContextProps) => {
  const { em } = context;

  // Since we are wrapped with wrapWithGlobalContext,
  // the companyContext filter is DISABLED here.
  // We will see data from ALL tenants.

  const totalUsers = await em.count(User);
  const totalCompanies = await em.count(Company);

  return createServiceResponse(200, 'Global stats fetched', true, {
    totalUsers,
    totalCompanies,
  });
};

export const superAdminResolvers = wrapWithGlobalContext({
  Query: {
    getGlobalSystemStats,
  },
});
