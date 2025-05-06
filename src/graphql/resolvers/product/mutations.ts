import { Product } from "../../../entities/Product";
import {
  ContextProps,
  CreateProduct,
  UpdateProductImage,
} from "../../../types/resolvers";
import { UserRol } from "../../../types/enums";
import { CustomResponse } from "../errors";
import { Update } from "aws-sdk/clients/dynamodb";
import { PictureUrl } from "../../../entities/PictureUrl";

export const createProduct = async (
  _: any,
  { product: { name, description, price } }: CreateProduct,
  { em, currentUser }: ContextProps
) => {
  //   const productRepo = em.getRepository(Product);

  if (!currentUser) return CustomResponse(400, "Please login");

  if (currentUser.rol !== UserRol.BOSS)
    return CustomResponse(403, "You are not allowed to create a product");

  if (!name || !description || !price)
    return CustomResponse(400, "Please fill all the fields");

  try {
    const product = em.create(Product, {
      name,
      description,
      price,
    });

    em.persistAndFlush(product);

    return CustomResponse(200, "Product created", true, { product });
  } catch (error) {
    console.error("Error creating product", error);
    return CustomResponse(500, "Error creating product", false, null);
  }
};

export const updateProductPicture = async (
  _: any,
  { imageName, imageUrl, productId }: UpdateProductImage,
  { em, currentUser }: ContextProps
) => {
  if (!currentUser) return CustomResponse(400, "Please login");

  if (currentUser.rol !== UserRol.BOSS)
    return CustomResponse(403, "You are not allowed to create a product");

  const productRepo = em.getRepository(Product);

  const product: Product = await productRepo.findOne({ id: productId });

  if (!product) return CustomResponse(404, "Product not found");

  try {
    const pictureUrl = em.create(PictureUrl, {
      name: imageName,
      url: imageUrl,
      product: product,
    });

    await em.persistAndFlush(pictureUrl);

    return CustomResponse(200, "Product picture updated", true, { product });
  } catch (error) {
    console.error("Error updating product picture", error);
    return CustomResponse(500, "Error updating product picture", false, null);
  }
};
