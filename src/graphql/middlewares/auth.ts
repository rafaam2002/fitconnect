import { ForbiddenError } from '../../utils/errors.util';

/**
 * Require authentication decorator
 */
export const withAuth = (requiredPermissions: string[], resolver: Function) => {
  return async (parent: any, args: any, context: any, info: any) => {
    const userPermissions = context.user?.permissions || [];

    if (!requiredPermissions.every(p => userPermissions.includes(p))) {
      throw new ForbiddenError('No autorizado');
    }

    return resolver(parent, args, context, info);
  };
};
