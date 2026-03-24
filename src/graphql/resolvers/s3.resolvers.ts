import { S3Service } from '../../services/s3.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getPresignedUrl = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { key, command } = args;

    const s3Service = new S3Service(em);
    return await s3Service.getPresignedUrl(currentUser, key);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const s3Resolvers = {
  Query: {
    getPresignedUrl,
  },
  Mutation: {},
};
