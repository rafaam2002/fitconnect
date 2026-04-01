import { CurrentUser } from '../../types/common.type';
import { ForbiddenError } from '../../utils/errors.util';

/**
 * Decorator to bypass the tenant filter for SuperAdmins
 */
export const withGlobalContext = (resolver: Function) => {
  return async (parent: any, args: any, context: any, info: any) => {
    const { em, currentUser } = context;
    const user = currentUser as CurrentUser | null;

    // Safety check: only SuperAdmins can bypass the tenant filter
    if (!user?.isSuperAdmin) {
      throw new ForbiddenError('SuperAdmin access required for global context');
    }

    // Defensive check: Try to disable the tenant filter if available
    const emAny = em;
    try {
      if (typeof emAny.getFilters === 'function') {
        emAny.getFilters().disable('companyContext');
      } else if (typeof emAny.addFilter === 'function') {
        // Fallback for some versions/drivers
        emAny.addFilter('companyContext', {}, false);
      }
    } catch (e) {
      console.warn('Could not disable companyContext filter:', e);
    }

    return resolver(parent, args, context, info);
  };
};

/**
 * Helper to wrap all resolvers (or a subset) in an object
 * with the global context logic.
 */
export const wrapWithGlobalContext = (resolvers: any): any => {
  const wrapped: any = {};
  for (const key in resolvers) {
    if (typeof resolvers[key] === 'function') {
      wrapped[key] = withGlobalContext(resolvers[key]);
    } else if (
      typeof resolvers[key] === 'object' &&
      resolvers[key] !== null &&
      !Array.isArray(resolvers[key])
    ) {
      wrapped[key] = wrapWithGlobalContext(resolvers[key]);
    } else {
      wrapped[key] = resolvers[key];
    }
  }
  return wrapped;
};
