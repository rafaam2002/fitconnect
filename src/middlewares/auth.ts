import jwt from 'jsonwebtoken'
import { User } from '../entities/User'
import { EntityManager } from '@mikro-orm/core'

export const authenticateUser = async (em: EntityManager, authorization?: string): Promise<User | null> => {
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.substring(7);

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
      const currentUser = await em.findOne(User, { id: decodedToken.id });
      return currentUser || null;
    } catch (error) {
      console.error('Authentication Error:', error);
      return null;
    }
  }
  return null;
};
