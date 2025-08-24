import { ContextProps } from "../../../types/resolvers";
import { CustomResponse } from "../errors";
import { PaymentMethod } from "../../../entities/PaymentMethod";
import { GraphQLError } from "graphql";

export const getCards = async (
  _: any,
  __: any,
  { em, currentUser }: ContextProps
) => {
  if (!currentUser)
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });

  const payments = await em.find(PaymentMethod, {
    user: currentUser.id,
  });

  return CustomResponse(200, "Payments found", true, { cards: payments });
};
