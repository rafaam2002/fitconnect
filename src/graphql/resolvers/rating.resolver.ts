import { RatingService } from '../../services/rating.service';
import {
  ContextProps,
  CreateOrUpdateRatingProps,
  GetCompanyRatingsProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getCompanyRatings = async (
  _: any,
  args: GetCompanyRatingsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId } = args;

    const ratingService = new RatingService(em);
    return await ratingService.getCompanyRatings(currentUser, companyId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getMyRating = async (
  _: any,
  args: GetCompanyRatingsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { companyId } = args;

    const ratingService = new RatingService(em);
    return await ratingService.getMyRating(currentUser, companyId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createOrUpdateRating = async (
  _: any,
  args: CreateOrUpdateRatingProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { rating } = args;
    const { score, comment } = rating;

    const ratingService = new RatingService(em);
    return await ratingService.createOrUpdateRating(currentUser, score, comment);
  } catch (error: any) {
    return handleError(error);
  }
};

export const deleteRating = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const ratingService = new RatingService(em);
    return await ratingService.deleteRating(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const ratingResolvers = {
  Query: {
    getCompanyRatings,
    getMyRating,
  },
  Mutation: {
    createOrUpdateRating,
    deleteRating,
  },
};