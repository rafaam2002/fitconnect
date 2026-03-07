import { CurrentUser } from '../../types/common.type';
import { ForbiddenError } from '../../utils/errors.util';

/**
 * Require authentication decorator
 */
export const withPermissions = (
  requiredPermissions: string[],
  resolver: Function
) => {
  return async (parent: any, args: any, context: any, info: any) => {
    const currentUser = context.currentUser as CurrentUser | null;
    const userPermissions = currentUser?.permissionNames || [];

    if (!requiredPermissions.every(p => userPermissions.includes(p))) {
      throw new ForbiddenError();
    }

    return resolver(parent, args, context, info);
  };
};
