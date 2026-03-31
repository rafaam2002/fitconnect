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

    // All permissions wildcard
    if (userPermissions.includes('*:*')) {
      return resolver(parent, args, context, info);
    }
    

    if (!requiredPermissions.every(p => {
      if (userPermissions.includes(p)) return true;
      
      const [module] = p.split(':');
      return userPermissions.includes(`${module}:manage`);
    })) {
      throw new ForbiddenError();
    }

    return resolver(parent, args, context, info);
  };
};
