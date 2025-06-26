import {ContextProps} from "../../../types/resolvers";
import {CustomResponse} from "../errors";
import {PaymentMethod} from "../../../entities/PaymentMethod";
import {stripe} from "../../../utils/const";
import {PaymentMethodStatus, PaymentMethodType} from "../../../types/enums";
import {EntityManager} from "@mikro-orm/postgresql";
import {UserType} from "../../../types";

export const addCreditCard = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    const {paymentMethod: data} = args;
    const {paymentMethodId, type} = data;
    const {em, currentUser} = context;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (!paymentMethodId) {
        return CustomResponse(400, "Please provide a payment method Id");
    }

    let stripeCustomerId = currentUser.stripeCustomerId;

    if (!stripeCustomerId) {
        const user = await stripe.customers.create({
            email: currentUser.email,
            name: currentUser.name,
        });
        stripeCustomerId = user.id;
        currentUser.stripeCustomerId = stripeCustomerId;

        await em.persistAndFlush(currentUser);
    }

    const existingPaymentMethod = await em.findOne(PaymentMethod, {
        stripePaymentMethodId: paymentMethodId
    });

    if (existingPaymentMethod) {
        throw new Error('Este método de pago ya está registrado');
    }

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
    });

    const existingPaymentMethodByCard = await em.findOne(PaymentMethod, {
        user: currentUser.id,
        cardLast4: paymentMethod.card.last4,
        cardExpMonth: paymentMethod.card.exp_month,
        cardExpYear: paymentMethod.card.exp_year,
        status: PaymentMethodStatus.ACTIVE
    });

    if (existingPaymentMethodByCard) {
        await stripe.paymentMethods.detach(paymentMethodId);
        throw new Error('Ya tienes una tarjeta registrada con estos mismos datos');
    }

    const existingPaymentMethods = await em.find(PaymentMethod, {
        user: currentUser.id,
        status: PaymentMethodStatus.ACTIVE
    });

    const isDefault = existingPaymentMethods.length === 0;
    if (isDefault) {
        await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }

    switch (type) {
        case PaymentMethodType.CREDIT_CARD:
            em.create(PaymentMethod, {
                user: currentUser,
                stripePaymentMethodId: paymentMethodId,
                cardBrand: paymentMethod.card.brand,
                cardLast4: paymentMethod.card.last4,
                cardExpMonth: paymentMethod.card.exp_month,
                cardExpYear: paymentMethod.card.exp_year,
                isDefault,
                type: PaymentMethodType.CREDIT_CARD,
            });
            break;
    }

    await em.persistAndFlush();


    return CustomResponse(200, `Metodo de pago creado exitosamente para el usuario ${currentUser.name}`, true);
};
