import { EntityManager } from '@mikro-orm/core';

import { BadRequestError } from '../utils/errors.util';

import { authenticateUser } from './auth';
import {
  filterPublicQueries,
  filterRefreshTokenQueries,
} from './filter-queries';

export const middleware = async (
  em: EntityManager,
  query: string,
  authorization?: string,
  companyId?: string
) => {
  const publicContext = filterPublicQueries(em, query);
  if (publicContext) return publicContext;

  const refreshContext = filterRefreshTokenQueries(em, query, companyId);
  if (refreshContext) return refreshContext;

  const currentUser = await authenticateUser(em, authorization);

  if (currentUser?.isSuperAdmin) {
    currentUser.permissionNames = ['*:*'];
  }

  if (currentUser?.activeCompanyId) {
    if (currentUser.activeCompanyId !== companyId) {
      throw new BadRequestError(
        'User is logged in two companies at the same time'
      );
    }
    em.setFilterParams('companyContext', {
      companyId: currentUser.activeCompanyId,
    });
  }

  return { em, currentUser };
};
