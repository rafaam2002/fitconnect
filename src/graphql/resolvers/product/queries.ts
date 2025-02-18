import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Product } from "../../../entities/Product";

export const getProducts = async (
  _: any,
  __: any,
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  //   const productRepo = em.getRepository(Product);

  if (!currentUser) {
    return {
      success: false,
      code: "401",
      message: "Please login",
    };
  }

  const products = await em.findAll(Product, {});
  return {
    success: true,
    code: "200",
    message: "Schedules found",
    products,
  };
};
