import { Product } from "../../entities/Product";
import {User, UserRole} from "../../entities/User";
import { sendPushNotification } from "../../utils/notifications";
import {
    ContextProps,
    CreateProduct, RemoveProductProps,
    UpdateProductImage,
} from "../../types/resolvers";
import { CustomResponse } from "./errors";
import { GraphQLError } from "graphql";
import { createPictureUrl, getPresignedUrl } from "../../utils/createPresignedUrls";

// ===== QUERY RESOLVERS =====
export const getProducts = async (
    _: any,
    __: any,
    { em, currentUser }: ContextProps
) => {
    if (!currentUser) throw new GraphQLError("Please login, token_expired", {
        extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
        },
    });

    const products = await em.findAll(Product, {});

    return CustomResponse(200, "Products found", true, {products});
};

// ===== MUTATION RESOLVERS =====
export const createProduct = async (
  _: any,
  { product: { name, description, price } }: CreateProduct,
  { em, currentUser }: ContextProps
) => {
  //   const productRepo = em.getRepository(Product);

  if (!currentUser) throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });

  if (currentUser.role !== UserRole.BOSS)
    return CustomResponse(403, "You are not allowed to create a product");

  if (!name || !description || !price)
    return CustomResponse(400, "Please fill all the fields");

  try {
    const product = em.create(Product, {
      name,
      description,
      price,
    });

    await em.persistAndFlush(product);

    // Send notification to all users
    const users = await em.find(User, {}, { populate: ["pushTokens"] });
    const notificationTitle = "¡Nuevo producto disponible!";
    const notificationBody = name;
    const notificationData = {
      type: "new_product",
      productId: product.id,
    };

    users.forEach((user) => {
      if (user.pushTokens && user.pushTokens.length > 0) {
        user.pushTokens.getItems().forEach((pushToken) => {
          sendPushNotification(
            pushToken.token,
            notificationTitle,
            notificationBody,
            notificationData
          );
        });
      }
    });

    return CustomResponse(200, "Product created", true, { product });
  } catch (error) {
    console.error("Error creating product", error);
    return CustomResponse(500, "Error creating product", false, null);
  }
};

export const updateProductPicture = async (
  _: any,
  { imageName, productId }: UpdateProductImage,
  { em, currentUser }: ContextProps
) => {
  if (!currentUser) throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });

  if (currentUser.role !== UserRole.BOSS)
    return CustomResponse(403, "You are not allowed to create a product");

  const productRepo = em.getRepository(Product);

  const product: Product = await productRepo.findOne({ id: productId });

  if (!product) return CustomResponse(404, "Product not found");

  try {
     const pictureUrl = await createPictureUrl(
          em,
          {
            id: productId,
            name: imageName,
            type: "product",
          },
          await getPresignedUrl(imageName)
        );

    await em.persistAndFlush(pictureUrl);

    return CustomResponse(200, "Product picture updated", true, { product });
  } catch (error) {
    console.error("Error updating product picture", error);
    return CustomResponse(500, "Error updating product picture", false, null);
  }
};

export const removeProduct = async (
    _: any,
    args: RemoveProductProps,
    context: ContextProps
) => {
    const { ids } = args;
    const { em, currentUser } = context;

    if (!currentUser) {
        throw new GraphQLError("Please login, token_expired", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }

    if (!ids || ids.length === 0) {
        return CustomResponse(400, "At least one product ID is required");
    }

    const productRepo = em.getRepository(Product);

    const products = await productRepo.find({
        id: { $in: ids },
    });

    if (products.length === 0) {
        return CustomResponse(404, "No products found with the provided IDs");
    }

    if (products.length !== ids.length) {
        const foundIds = products.map(product => product.id);
        const notFoundIds = ids.filter(id => !foundIds.includes(id));
        return CustomResponse(404, `Some products not found: ${notFoundIds.join(', ')}`);
    }

    try {
        await em.removeAndFlush(products);

        return CustomResponse(200, `${products.length} product(s) deleted successfully`, true);
    } catch (error) {
        console.error('Error deleting products:', error);
        return CustomResponse(500, "Error occurred while deleting products");
    }
};

export const productResolvers = {
    Query: {
        getProducts,
    },
    Mutation: {
        createProduct,
        updateProductPicture,
        removeProduct,
    }
}