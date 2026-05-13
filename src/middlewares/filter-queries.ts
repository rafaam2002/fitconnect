import { EntityManager } from '@mikro-orm/core';

export const filterPublicQueries = (em: EntityManager, query: string) => {
  // 2. Si es operación pública (login, etc), dejar pasar sin auth
  const publicOperations = [
    'login',
    'createUser',
    'forgotPassword',
    'verifyEmail',
    'loginWithGoogle',
    'sendChangePasswordEmail',
    // 'requestJoinCompany',
  ]; // ...tus ops

  if (publicOperations.some(op => query.includes(op))) {
    return { em, currentUser: null };
  }

  return null;
};

export const filterRefreshTokenQueries = (
  em: EntityManager,
  query: string,
  companyId?: string
) => {
  const expiredTokenOperations = ['refreshAccessToken'];

  if (expiredTokenOperations.some(op => query.includes(op))) {
    if (companyId) {
      em.setFilterParams('companyContext', {
        companyId,
      });
    }
    return { em, currentUser: null };
  }

  return null;
};
