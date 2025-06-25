import Stripe from "stripe";
import {PaymentMethod} from "../../../entities/PaymentMethod";
import {ContextProps} from "../../../types/resolvers";
import {Plan} from "../../../entities/Plan";
import {User} from "../../../entities/User";
import {CreditCardProvider, PaymentMethodType, PaymentType, SubscriptionStatus} from "../../../types/enums";
import {Subscription} from "../../../entities/Subscription";
import {CustomResponse} from "../errors";
import {Transaction} from "../../../entities/Transaction";
import {stripe} from "../../../utils/const";
import {UserType} from "../../../types";



export const createSubscription = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    const { planId, applePayToken, googlePayToken } =
        args.subscription;
    const { em, currentUser } = context;
    const paymentMethod = 'credit_card';
    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (!planId) {
        CustomResponse(400, "Please provide a plan Id");
    }

    if (!paymentMethod) {
        return CustomResponse(400, "Please provide a payment method");
    }

    const plan = await em.findOne(Plan, { id: planId });
    const user = await em.findOne(User, { id: currentUser.id }, { populate: ['cards'] });
    console.log(user.cards)
    const defaultCard = user?.cards.find(card => card.isDefault);

    if (!plan) {
        return CustomResponse(404, "Plan not found");
    }

    if (!user) {
        return CustomResponse(404, "User not found");
    }

    const startDate = new Date();
    const endDate = new Date();

    endDate.setMonth(
        startDate.getMonth() + (plan.paymentType === PaymentType.MENSUAL ? 1 : 12)
    );

    const subscription = em.create(Subscription, {
        user,
        plan,
        status: SubscriptionStatus.PENDING,
        startDate,
        endDate,
    });

    await em.persistAndFlush(subscription);

    if (!subscription) {
        return CustomResponse(404, "Subscription not found");
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
        return CustomResponse(400, "User already has an active subscription");
    }

    const paymentData = {
        em,
        paymentMethod,
        cardId: defaultCard.id,
        planId,
        subscription,
        applePayToken,
        googlePayToken,
    };

    await addTransaction(paymentData, currentUser);

    return CustomResponse(200, "Subscription created successfully", true);
};

export const removeSubscription = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    const { planId } = args;
    const { em, currentUser } = context;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (!planId) {
        return CustomResponse(400, "Please provide a plan Id");
    }

    const plan = await em.findOne(Plan, { id: planId });
    const user = em.getReference(User, currentUser.id);

    if (!user) {
        return CustomResponse(404, "User not found");
    }
    if (!plan) {
        return CustomResponse(404, "Plan not found");
    }

    await em.remove(plan).flush();

    return CustomResponse(200, "Plan deleted successfully", true);
};

export const addTransaction = async (paymentData: any, user: UserType) => {
    const {
        em,
        paymentMethod,
        cardId,
        planId,
        subscription,
        applePayToken,
        googlePayToken,
    } = paymentData;

    const amount = subscription.plan.price * 100;
    const currency = subscription.plan.currency;

    let payment: Stripe.PaymentIntent;
    let reference: string = "";
    let authCode: string = "";
    let charge: Stripe.Charge;

    try {
        switch (paymentMethod) {
            case PaymentMethodType.CREDIT_CARD:
                if (!cardId) {
                    return {
                        success: false,
                        code: "400",
                        message: "Please provide a paymentMethod Id",
                    };
                }
                const card = await em.findOneOrFail(PaymentMethodType, { id: cardId });

                payment = await stripe.paymentIntents.create({
                    amount,
                    currency,
                    customer: user.stripeCustomerId,
                    payment_method: card.stripePaymentMethodId,
                    automatic_payment_methods: {
                        enabled: true,
                        allow_redirects: 'never'
                    },
                    confirm: true,
                    description: `Pago de la suscripción ${subscription.plan.name}`,
                });

                charge = payment.latest_charge
                    ? await stripe.charges.retrieve(payment.latest_charge as string)
                    : null;

                reference = payment.client_secret || "";
                authCode = charge?.id || "";
                break;
            case "APPLE_PAY":
                if (!applePayToken) {
                    return {
                        success: false,
                        code: "400",
                        message: "Please provide a apple pay token",
                    };
                }
                payment = await stripe.paymentIntents.create({
                    amount,
                    currency,
                    payment_method: applePayToken,
                    confirm: true,
                    description: `Pago de suscripción al plan ${subscription.plan.name} (Apple Pay)`,
                });

                charge = payment.latest_charge
                    ? await stripe.charges.retrieve(payment.latest_charge as string)
                    : null;

                reference = payment.client_secret || "";
                authCode = charge?.id || "";
                break;
            case "GOOGLE_PAY":
                if (!googlePayToken) {
                    return {
                        success: false,
                        code: "400",
                        message: "Please provide a google pay token",
                    };
                }

                // 🔐 Procesar pago con Google Pay
                payment = await stripe.paymentIntents.create({
                    amount,
                    currency,
                    payment_method: googlePayToken,
                    confirm: true,
                    description: `Pago de suscripción al plan ${subscription.plan.name} (Google Pay)`,
                });

                charge = payment.latest_charge
                    ? await stripe.charges.retrieve(payment.latest_charge as string)
                    : null;

                reference = payment.client_secret || "";
                authCode = charge?.id || "";
                break;
            default:
                throw new Error("Método de pago no soportado.");
        }

        const transaccion = em.create(Transaction, {
            user,
            subscription,
            paymentMethod,
            amount: subscription.plan.price,
            currency,
            status: "SUCCESS",
            transactionId: payment.id,
            reference,
            transactionDate: new Date(),
            description: `Pago exitoso de suscripción al plan ${subscription.plan.name}`,
            authCode,
        });

        subscription.status = "ACTIVE";
        subscription.startDate = new Date();
        subscription.endDate = new Date(
            new Date().setMonth(
                new Date().getMonth() +
                (subscription.plan.paymentType === "MENSUAL" ? 1 : 12)
            )
        );

        await em.persistAndFlush([transaccion, subscription]);

        return `Pago exitoso. ID de transacción: ${payment.id}`;
    } catch (error: any) {
        const transaccion = em.create(Transaction, {
            user,
            subscription,
            paymentMethod,
            amount: subscription.plan.price,
            currency,
            status: "FAILED",
            transactionId: "",
            reference: "",
            transactionDate: new Date(),
            description: `Pago fallido de suscripción al plan ${subscription.plan.name}: ${error.message}`,
            authCode: "",
        });

        await em.persistAndFlush(transaccion);
        throw new Error(`Error al procesar el pago: ${error.message}`);
    }
};
