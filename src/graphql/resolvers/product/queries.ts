import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Product } from "../../../entities/Product";
import { CustomResponse } from "../errors";
import { ContextProps } from "../../../types/resolvers";

export const getProducts = async (
  _: any,
  __: any,
  { em, currentUser }: ContextProps
) => {
  if (!currentUser) return CustomResponse(401, "Please login");

  const products = await em.findAll(Product, {});

  return CustomResponse(200, "Products found", true, {products});
};
