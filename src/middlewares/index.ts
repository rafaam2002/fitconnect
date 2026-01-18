import { EntityManager } from '@mikro-orm/core';

import {
  BadRequestError,
} from '../utils/errors.util';
import { authenticateUser } from './auth';

export const middleware = async (
  em: EntityManager,
  authorization?: string,
  companyId?: string,
  isSetCompanyMe?: boolean
) => {
  const currentUser = await authenticateUser(em, authorization);

  if (isSetCompanyMe) {
    em.setFilterParams('companyContext', {
      companyId,
    });
  } else if (currentUser?.activeCompanyId) {
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
