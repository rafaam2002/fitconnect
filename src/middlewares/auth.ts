import { EntityManager } from '@mikro-orm/core';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

import { User } from '../entities/User';
import { PermissionService } from '../services/permission.service';
import { CurrentUser } from '../types/common.type';
import { LoginPermissionsContext } from '../types/permissions';
import { UnauthorizedError } from '../utils/errors.util';

export const authenticateUser = async (
  em: EntityManager,
  authorization?: string
): Promise<CurrentUser | null> => {
  if (authorization?.toLowerCase().startsWith('bearer ')) {
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

      const permissionService = new PermissionService(em);

      let permissions: LoginPermissionsContext = {
        hasActiveSubscription: false,
        plan: null,
        permissions: [],
        permissionNames: [],
        subscriptionStatus: null,
        trialEndsAt: null,
        renewsAt: null,
      };
      if (currentUser?.activeCompanyId) {
        permissions = await permissionService.getLoginPermissionsContext(
          currentUser,
          currentUser.activeCompanyId
        );
      }

      const currentUserWithPermissions = {
        ...currentUser,
        ...permissions,
        contextRole: currentUser.contextRole || 'standard',
        // Make sure mandatory fields from CurrentUser are include
      };

      return currentUserWithPermissions as CurrentUser;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedError();
      } else {
        throw error;
      }
    }
  }
  throw new UnauthorizedError('No token provided');
};
