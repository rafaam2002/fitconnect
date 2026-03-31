import { ProductService } from '../../services/product.service';
import { ContextProps, CreateProductProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import { productsPermissions } from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

// ===== QUERY RESOLVERS =====

export const getProducts = async (_: any, __: any, context: ContextProps) => {
  try {
    const { em, currentUser } = context;

    const productService = new ProductService(em);
    return await productService.getProducts(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createProduct = async (
  _: any,
  args: CreateProductProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { product } = args;
    const { name, description, price } = product;

    const productService = new ProductService(em);
    return await productService.createProduct(
      currentUser,
      name,
      description,
      price
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateProductPicture = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { imageName, productId } = args;

    const productService = new ProductService(em);
    return await productService.updateProductPicture(
      currentUser,
      imageName,
      productId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const removeProduct = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { ids } = args;

    const productService = new ProductService(em);
    return await productService.removeProducts(currentUser, ids);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const productResolvers = {
  Query: {
    getProducts,
  },
  Mutation: {
    createProduct: withPermissions(productsPermissions.CREATE, createProduct),
    updateProductPicture: withPermissions(productsPermissions.UPDATE, updateProductPicture),
    removeProduct: withPermissions(productsPermissions.DELETE, removeProduct),
  },
};
