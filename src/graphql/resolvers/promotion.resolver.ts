import { PromotionService } from '../../services/promotion.service';
import {
  ContextProps,
  CreatePromotionProps,
  UpdatePromotionProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import { promotionsPermissions } from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

// ===== QUERY RESOLVERS =====

export const getCompanyPromotions = async (
  _: any,
  args: { includeInactive?: boolean },
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { includeInactive } = args;

    const promotionService = new PromotionService(em);
    return await promotionService.getCompanyPromotions(
      currentUser,
      includeInactive
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getActivePromotions = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const promotionService = new PromotionService(em);
    return await promotionService.getActivePromotions(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createPromotion = async (
  _: any,
  args: CreatePromotionProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { promotion } = args;

    const promotionService = new PromotionService(em);
    return await promotionService.createPromotion(currentUser, promotion);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updatePromotion = async (
  _: any,
  args: UpdatePromotionProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { id, promotion } = args;

    const promotionService = new PromotionService(em);
    return await promotionService.updatePromotion(currentUser, id, promotion);
  } catch (error: any) {
    return handleError(error);
  }
};

export const deletePromotion = async (
  _: any,
  args: { id: string },
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { id } = args;

    const promotionService = new PromotionService(em);
    return await promotionService.deletePromotion(currentUser, id);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const promotionResolvers = {
  Query: {
    getCompanyPromotions: withPermissions(
      promotionsPermissions.READ,
      getCompanyPromotions
    ),
    getActivePromotions,
  },
  Mutation: {
    createPromotion: withPermissions(
      promotionsPermissions.CREATE,
      createPromotion
    ),
    updatePromotion: withPermissions(
      promotionsPermissions.UPDATE,
      updatePromotion
    ),
    deletePromotion: withPermissions(
      promotionsPermissions.DELETE,
      deletePromotion
    ),
  },
};
