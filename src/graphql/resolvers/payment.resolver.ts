// graphql/resolvers/payment.resolver.ts
//
// Operaciones:
//   Query    getClientToken              → SetupIntent para añadir tarjeta a TU cuenta master
//   Query    getCompanyClientToken       → SetupIntent para añadir tarjeta en la cuenta de una empresa (Connect)
//   Query    getPaymentConnectionStatus  → estado de conexión Stripe de una empresa
//   Mutation addPaymentMethod            → adjunta un pm_xxx/tok_xxx y lo guarda en BD
//   Mutation tokenizeCard                → tokeniza datos de tarjeta en el servidor
//   Mutation getPaymentOAuthUrl          → URL OAuth para conectar cuenta Stripe
//   Mutation disconnectPaymentAccount    → desconectar cuenta Stripe de una empresa

import { Customer } from '../../entities/Customer';
import { CustomerService } from '../../services/customer.service';
import { PaymentMethodService } from '../../services/payment.method.service';
import { StripeConnectService } from '../../services/stripe.connect.service';
import { ContextProps } from '../../types/resolvers';
import { BadRequestError, handleError } from '../../utils/errors.util';

/**
 * Resuelve (o crea) el processorCustomerId del Customer local en Stripe.
 * Compartido entre getClientToken/getCompanyClientToken y addPaymentMethod
 * para no duplicar la lógica de creación del Customer en el Vault.
 */
async function resolveProcessorCustomerId(
  context: ContextProps,
  customer: Customer,
  connectedAccountId?: string
): Promise<string> {
  const { em, currentUser, paymentProcessor } = context;

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

  return processorCustomerId;
}

// ── Query: getClientToken ──────────────────────────────────────────────────────
//
// Genera el SetupIntent para que el usuario añada una tarjeta a TU cuenta
// master (ej: el admin pagando su mensualidad a la plataforma).

export const getClientToken = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    const customerService = new CustomerService(em);
    const customer = await customerService.getOrCreateCustomer({
      id: currentUser.id,
    } as any);

    const processorCustomerId = await resolveProcessorCustomerId(
      context,
      customer
    );

    const result = await paymentProcessor.generateClientToken({
      processorCustomerId,
    });

    return {
      code: '200',
      success: true,
      message: 'Client token generated successfully',
      data: {
        clientToken: result.clientToken,
        setupIntentId: result.setupIntentId ?? null,
      },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ── Query: getCompanyClientToken ───────────────────────────────────────────────
//
// Genera el SetupIntent para que un cliente añada una tarjeta DENTRO de la
// cuenta Stripe conectada de una empresa (ej: cliente pagando a su gym).

export const getCompanyClientToken = async (
  _: any,
  args: { companyId: string },
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    if (!args.companyId) {
      throw new BadRequestError('companyId is required');
    }

    const connectService = new StripeConnectService(em);
    const connectedAccountId = await connectService.getConnectedAccountId(
      args.companyId
    );

    const customerService = new CustomerService(em);
    const customer = await customerService.getOrCreateCustomer({
      id: currentUser.id,
    } as any);

    const processorCustomerId = await resolveProcessorCustomerId(
      context,
      customer,
      connectedAccountId
    );

    const result = await paymentProcessor.generateClientToken({
      processorCustomerId,
      connectedAccountId,
    });

    return {
      code: '200',
      success: true,
      message: 'Client token generated successfully',
      data: {
        clientToken: result.clientToken,
        setupIntentId: result.setupIntentId ?? null,
      },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

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
        missingRequirements: details.missingRequirements ?? false,
        disabledReason: details.disabledReason ?? false,
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

    const processorCustomerId = await resolveProcessorCustomerId(
      context,
      customer,
      connectedAccountId
    );

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

/**
 * ── Mutation: confirmPaymentMethodFromSetupIntent ──────────────────────────────
 *
 * Flujo PaymentSheet (recomendado): el SDK nativo de Stripe ya confirmó el
 * SetupIntent y vinculó el PaymentMethod al Customer directamente en los
 * servidores de Stripe — el número de tarjeta nunca llegó a este backend.
 * Aquí solo recuperamos QUÉ PaymentMethod fue, para sincronizarlo en BD local.
 **/

export const confirmPaymentMethodFromSetupIntent = async (
  _: any,
  args: { setupIntentId: string; setAsDefault?: boolean; companyId?: string },
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    if (!args.setupIntentId) {
      throw new BadRequestError('setupIntentId is required');
    }

    let connectedAccountId: string | undefined;
    if (args.companyId) {
      const connectService = new StripeConnectService(em);
      connectedAccountId = await connectService
        .getConnectedAccountId(args.companyId)
        .catch(() => undefined);
    }

    const customerService = new CustomerService(em);
    const customer = await customerService.getOrCreateCustomer({
      id: currentUser.id,
    } as any);

    const result = await paymentProcessor.getConfirmedPaymentMethod({
      setupIntentId: args.setupIntentId,
      connectedAccountId,
    });

    if (!result.success || !result.paymentMethodToken) {
      throw new BadRequestError(
        result.errorMessage ?? 'Could not confirm payment method'
      );
    }

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.addPaymentMethod({
      customerId: customer.id,
      externalToken: result.paymentMethodToken,
      brand: result.brand,
      last4: result.last4,
      expiryMonth: result.expiryMonth,
      expiryYear: result.expiryYear,
      fingerprint: result.fingerprint,
      country: result.country,
      setAsDefault: args.setAsDefault ?? false,
      ...(connectedAccountId && {
        metadata: { connectedAccountId },
      }),
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const getPaymentOnboardingUrl = async (
  _: any,
  args: { companyId: string; platform?: string },
  context: ContextProps
) => {
  try {
    const connectService = new StripeConnectService(context.em);

    // Si adaptaste getOnboardingLink para recibir el parámetro platform, pásalo aquí.
    // Si no, simplemente llama a connectService.getOnboardingLink(args.companyId)
    const url = await connectService.getOnboardingLink(args.companyId);

    return {
      code: '200',
      success: true,
      message: 'Onboarding URL generated successfully',
      url,
    };
  } catch (error: any) {
    return handleError(error);
  }
};
// ── Export ─────────────────────────────────────────────────────────────────────

export const paymentResolvers = {
  Query: {
    getClientToken,
    getCompanyClientToken,
    getPaymentConnectionStatus,
  },
  Mutation: {
    addPaymentMethod,
    confirmPaymentMethodFromSetupIntent,
    tokenizeCard,
    getPaymentOAuthUrl,
    disconnectPaymentAccount,
    getPaymentOnboardingUrl,
  },
};
