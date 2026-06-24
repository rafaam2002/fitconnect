// graphql/resolvers/payment.resolver.ts
//
// Operaciones:
//   Query    getPaymentConnectionStatus  → estado de conexión Stripe de una empresa
//   Mutation addPaymentMethod            → tokeniza un tok_xxx y lo guarda en BD
//   Mutation tokenizeCard               → tokeniza datos de tarjeta en el servidor
//   Mutation getPaymentOAuthUrl          → URL OAuth para conectar cuenta Stripe
//   Mutation disconnectPaymentAccount   → desconectar cuenta Stripe de una empresa

import { CustomerService } from '../../services/customer.service';
import { PaymentMethodService } from '../../services/payment.method.service';
import { StripeConnectService } from '../../services/stripe.connect.service';
import { ContextProps } from '../../types/resolvers';
import { BadRequestError, handleError } from '../../utils/errors.util';

// ── Query: getPaymentConnectionStatus ─────────────────────────────────────────

export const getPaymentConnectionStatus = async (
  _: any,
  args: { companyId: string },
  context: ContextProps
) => {
  try {
    const connectService = new StripeConnectService(context.em);
    const details = await connectService.getConnectionDetails(args.companyId);

    return {
      code: '200',
      success: true,
      message: 'Connection status fetched',
      status: {
        isConnected: details.isConnected,
        accountId: details.accountId ?? null,
        status: details.status ?? null,
        connectedAt: details.connectedAt?.toISOString() ?? null,
        chargesEnabled: details.chargesEnabled ?? false,
        payoutsEnabled: details.payoutsEnabled ?? false,
      },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Mutation: addPaymentMethod ─────────────────────────────────────────────────
//
// Recibe el tok_xxx generado por tokenizeCard y lo adjunta al Customer en Stripe,
// luego lo guarda como PaymentMethod en la BD local.

export const addPaymentMethod = async (
  _: any,
  args: {
    nonce: string;
    setAsDefault?: boolean;
    verifyCard?: boolean;
    companyId?: string;
  },
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    if (!args.nonce) {
      throw new BadRequestError('Payment method token (nonce) is required');
    }

    // Resolver connectedAccountId si hay companyId
    let connectedAccountId: string | undefined;
    if (args.companyId) {
      const connectService = new StripeConnectService(em);
      connectedAccountId = await connectService
        .getConnectedAccountId(args.companyId)
        .catch(() => undefined);
    }

    // Obtener o crear el Customer local
    const customerService = new CustomerService(em);
    const customer = await customerService.getOrCreateCustomer({
      id: currentUser.id,
    } as any);

    const processorKey = connectedAccountId
      ? `processorCustomerId_${connectedAccountId}`
      : 'processorCustomerId';

    let processorCustomerId: string = customer.metadata?.[processorKey];

    if (!processorCustomerId) {
      const vaultResult = await paymentProcessor.createVaultCustomer({
        externalId: customer.id,
        email: currentUser.email,
        connectedAccountId,
      });

      if (!vaultResult.success || !vaultResult.processorCustomerId) {
        throw new BadRequestError(
          vaultResult.errorMessage ??
            'Failed to create customer in payment processor'
        );
      }

      processorCustomerId = vaultResult.processorCustomerId;
      customer.metadata = {
        ...customer.metadata,
        [processorKey]: processorCustomerId,
      };
      await em.flush();
    }

    // Adjuntar el tok_xxx al Customer en Stripe
    const vaultResult = await paymentProcessor.vaultPaymentMethod({
      processorCustomerId,
      nonce: args.nonce,
      verifyCard: args.verifyCard ?? true,
      makeDefault: args.setAsDefault ?? false,
      connectedAccountId,
    });

    if (!vaultResult.success || !vaultResult.paymentMethodToken) {
      throw new BadRequestError(
        vaultResult.errorMessage ?? 'Failed to vault payment method'
      );
    }

    // Guardar en la BD local
    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.addPaymentMethod({
      customerId: customer.id,
      externalToken: vaultResult.paymentMethodToken,
      brand: vaultResult.brand,
      last4: vaultResult.last4,
      expiryMonth: vaultResult.expiryMonth,
      expiryYear: vaultResult.expiryYear,
      fingerprint: vaultResult.fingerprint,
      country: vaultResult.country,
      setAsDefault: args.setAsDefault ?? false,
      ...(connectedAccountId && {
        metadata: { connectedAccountId },
      }),
    });
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Mutation: tokenizeCard ────────────────────────────────────────────────────
//
// Tokeniza los datos de la tarjeta en el servidor → devuelve tok_xxx.
// Luego pasar ese tok_xxx a addPaymentMethod como nonce.

export const tokenizeCard = async (
  _: any,
  args: {
    cardNumber: string;
    expirationMonth: string;
    expirationYear: string;
    cvv: string;
    cardholderName?: string;
  },
  context: ContextProps
) => {
  try {
    const result = await context.paymentProcessor.tokenizeCard({
      cardNumber: args.cardNumber.replace(/\s/g, ''),
      expirationMonth: args.expirationMonth,
      expirationYear:
        args.expirationYear.length === 2
          ? `20${args.expirationYear}`
          : args.expirationYear,
      cvv: args.cvv,
      cardholderName: args.cardholderName,
    });

    if (!result.success || !result.nonce) {
      throw new BadRequestError(
        result.errorMessage ?? 'Card tokenization failed'
      );
    }

    return {
      code: '200',
      success: true,
      message: 'Card tokenized successfully',
      data: { nonce: result.nonce },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Mutation: getPaymentOAuthUrl ───────────────────────────────────────────────

export const getPaymentOAuthUrl = async (
  _: any,
  args: { companyId: string; platform?: string },
  context: ContextProps
) => {
  try {
    const connectService = new StripeConnectService(context.em);
    const url = connectService.getOAuthUrl(
      args.companyId,
      (args.platform as 'web' | 'mobile') ?? 'web'
    );
    return { code: '200', success: true, message: 'OAuth URL generated', url };
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Mutation: disconnectPaymentAccount ────────────────────────────────────────

export const disconnectPaymentAccount = async (
  _: any,
  args: { companyId: string },
  context: ContextProps
) => {
  try {
    const connectService = new StripeConnectService(context.em);
    await connectService.disconnectCompany(args.companyId);

    return {
      code: '200',
      success: true,
      message: 'Payment account disconnected successfully',
      status: {
        isConnected: false,
        accountId: null,
        status: null,
        connectedAt: null,
        chargesEnabled: false,
        payoutsEnabled: false,
      },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Export ─────────────────────────────────────────────────────────────────────

export const paymentResolvers = {
  Query: {
    getPaymentConnectionStatus,
  },
  Mutation: {
    addPaymentMethod,
    tokenizeCard,
    getPaymentOAuthUrl,
    disconnectPaymentAccount,
  },
};
