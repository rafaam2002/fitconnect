import { IResolvers } from '@graphql-tools/utils';

import { PermissionService } from '../../services/permission.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

// ===== MUTATION RESOLVERS =====

/**
 * Synchronize missing permissions in the database
 */
const syncPermissions = async (_: any, args: any, context: ContextProps) => {
  try {
    const { em } = context;
    const permissionService = new PermissionService(em);

    await permissionService.syncMissingPermissions();

    return {
      code: '200',
      message: 'Permissions synchronized successfully',
      success: true,
    };
  } catch (error: any) {
    return handleError(error);
  }
};

export const permissionResolvers: IResolvers = {
  Query: {},
  Mutation: {
    syncPermissions,
  },
};
