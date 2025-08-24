import { EntityManager } from "@mikro-orm/postgresql";
import { UserType } from "../../../types";
import { Product } from "../../../entities/Product";
import { CustomResponse } from "../errors";
import { GraphQLError } from "graphql";
import { ContextProps } from "../../../types/resolvers";

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
