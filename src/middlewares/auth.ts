import { EntityManager } from '@mikro-orm/core';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

import { User } from '../entities/User';
import { CurrentUser } from '../types/common.type';
import { UnauthorizedError } from '../utils/errors.util';

export const authenticateUser = async (
  em: EntityManager,
  authorization?: string
): Promise<CurrentUser | null> => {
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.substring(7);

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const currentUser = await em.findOne(User, { id: decodedToken.id }, {
        filters: false,
        populate: ['companies'],
      } as any);

      if (!currentUser) {
        throw new UnauthorizedError();
      }

      return currentUser as CurrentUser;
    } catch (error) {
      if(error instanceof TokenExpiredError) {
        throw new UnauthorizedError();
      } else {
        throw error;
      }
    }
  }
  return null;
};
