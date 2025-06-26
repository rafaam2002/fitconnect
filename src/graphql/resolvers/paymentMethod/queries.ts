import {ContextProps} from "../../../types/resolvers";
import {CustomResponse} from "../errors";
import {PaymentMethod} from "../../../entities/PaymentMethod";

export const getCards = async (
    _: any,
    __: any,
    {em, currentUser}: ContextProps
) => {
    if (!currentUser)
        return CustomResponse(401, "Please login");

    const payments = await em.find(PaymentMethod, {
        user: currentUser.id
    });

    return CustomResponse(200, "Payments found", true, {cards: payments});
};
