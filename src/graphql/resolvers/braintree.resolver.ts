import { Customer } from '../../entities/Customer';
import { BraintreeProcessor } from '../../services/braintree.processor';
import { CustomerService } from '../../services/customer.service';
import { PaymentMethodService } from '../../services/payment.method.service';
import { ContextProps } from '../../types/resolvers';
import { BadRequestError, handleError } from '../../utils/errors.util';

/**
 * braintree.resolver.ts
 *
 * Resolvers específicos de Braintree que no forman parte del flujo genérico
 * de PaymentMethodService ni TransactionService.
 *
 * Expone dos operaciones:
 *
 *   Query  getBraintreeClientToken     — genera el token para el Drop-in UI
 *   Mutation addPaymentMethodFromNonce — convierte un nonce en token permanente
 *
 * ──────────────────────────────────────────────────────────────────
 * FLUJO COMPLETO DE AÑADIR TARJETA:
 * ──────────────────────────────────────────────────────────────────
 *
 * 1. Frontend llama a getBraintreeClientToken
 *    → Backend genera clientToken via gateway.clientToken.generate()
 *    → Frontend inicializa Drop-in UI con ese token
 *
 * 2. Usuario introduce su tarjeta en el Drop-in UI de Braintree
 *    → El Drop-in UI tokeniza la tarjeta en los servidores de Braintree
 *    → Devuelve un nonce de un solo uso al frontend
 *
 * 3. Frontend llama a addPaymentMethodFromNonce(nonce, setAsDefault)
 *    → Backend crea/obtiene el Customer en el Vault de Braintree
 *    → Convierte el nonce en paymentMethodToken permanente
 *    → Guarda el token como externalToken en PaymentMethod
 *
 * 4. A partir de aquí, todos los cobros usan ese token vía PaymentProcessor.charge()
 *    sin intervención del usuario — incluyendo el CRON de renovaciones.
 */

// ─────────────────────────────────────────────
// QUERY
// ─────────────────────────────────────────────

/**
 * Genera el clientToken de Braintree que el frontend necesita para
 * inicializar el Drop-in UI o Hosted Fields.
 *
 * Si el usuario ya tiene un Customer en el Vault, se pasa su braintreeCustomerId
 * para que el Drop-in muestre sus métodos de pago guardados.
 */
export const getBraintreeClientToken = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    if (!(paymentProcessor instanceof BraintreeProcessor)) {
      throw new BadRequestError('Payment processor is not Braintree');
    }

    // Buscar si el usuario ya tiene un Customer con braintreeCustomerId
    const customer = await em.findOne(Customer, {
      user: currentUser.id,
      isActive: true,
    });

    const braintreeCustomerId =
      customer?.metadata?.braintreeCustomerId ?? undefined;

    const clientToken =
      await paymentProcessor.generateClientToken(braintreeCustomerId);

    return {
      code: '200',
      success: true,
      message: 'Client token generated successfully',
      data: { clientToken },
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ─────────────────────────────────────────────
// MUTATION
// ─────────────────────────────────────────────

/**
 * Convierte el nonce de un solo uso (devuelto por el Drop-in UI)
 * en un paymentMethodToken permanente almacenado en el Vault de Braintree.
 *
 * Pasos internos:
 *  1. Obtener o crear el Customer local
 *  2. Si el Customer no tiene braintreeCustomerId, crear el cliente en el Vault
 *  3. Convertir el nonce en token permanente via gateway.paymentMethod.create()
 *  4. Guardar el token como PaymentMethod en la BD local
 */
export const addPaymentMethodFromNonce = async (
  _: any,
  args: {
    nonce: string;
    setAsDefault?: boolean;
    verifyCard?: boolean;
  },
  context: ContextProps
) => {
  try {
    const { em, currentUser, paymentProcessor } = context;

    if (!(paymentProcessor instanceof BraintreeProcessor)) {
      throw new BadRequestError('Payment processor is not Braintree');
    }

    if (!args.nonce) {
      throw new BadRequestError('Payment method nonce is required');
    }

    // 1. Obtener o crear el Customer local
    const customerService = new CustomerService(em);
    const customer = await customerService.getOrCreateCustomer({
      id: currentUser.id,
    } as any);

    // 2. Crear el cliente en el Vault de Braintree si no existe aún
    let braintreeCustomerId: string = customer.metadata?.braintreeCustomerId;

    if (!braintreeCustomerId) {
      const vaultResult = await paymentProcessor.createVaultCustomer({
        externalId: customer.id, // usamos el ID interno como ID en Braintree
        email: currentUser.email,
      });

      if (!vaultResult.success || !vaultResult.braintreeCustomerId) {
        throw new BadRequestError(
          vaultResult.errorMessage ??
            'Failed to create customer in Braintree Vault'
        );
      }

      braintreeCustomerId = vaultResult.braintreeCustomerId;

      // Persistir el braintreeCustomerId en el Customer local
      customer.metadata = {
        ...customer.metadata,
        braintreeCustomerId,
      };
      await em.flush();
    }

    // 3. Convertir nonce en token permanente
    const vaultResult = await paymentProcessor.vaultPaymentMethod({
      braintreeCustomerId,
      nonce: args.nonce,
      verifyCard: args.verifyCard ?? true,
      makeDefault: args.setAsDefault ?? false,
    });

    if (!vaultResult.success || !vaultResult.paymentMethodToken) {
      throw new BadRequestError(
        vaultResult.errorMessage ?? 'Failed to vault payment method'
      );
    }

    // 4. Guardar en la BD local como PaymentMethod
    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.addPaymentMethod({
      customerId: customer.id,
      externalToken: vaultResult.paymentMethodToken,
      brand: vaultResult.brand,
      last4: vaultResult.last4,
      expiryMonth: vaultResult.expiryMonth,
      expiryYear: vaultResult.expiryYear,
      fingerprint: vaultResult.uniqueNumberIdentifier,
      country: vaultResult.country,
      setAsDefault: args.setAsDefault ?? false,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

export const braintreeResolvers = {
  Query: {
    getBraintreeClientToken,
  },
  Mutation: {
    addPaymentMethodFromNonce,
  },
};
