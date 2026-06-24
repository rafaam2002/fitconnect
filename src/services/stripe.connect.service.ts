// services/stripe.connect.service.ts
//
// Gestiona el flujo OAuth de Stripe Connect para conectar cuentas de empresas.
//
// FLUJO:
//   1. getOAuthUrl(companyId)       → URL para redirigir al admin
//   2. handleOAuthCallback(code)    → intercambia code por access_token y lo guarda
//   3. getConnectedAccountId(companyId) → devuelve acct_xxx para usar en cobros
//   4. disconnectCompany(companyId) → revoca el acceso y limpia la BD
//
// Cuando los clientes de un admin pagan:
//   → ChargeParams.connectedAccountId = company.stripeAccountId
//   → ChargeParams.applicationFeeAmount = tu comisión en centavos
//   → El dinero va a la cuenta bancaria del admin
//   → Tu comisión llega a tu cuenta master automáticamente
//
// Cuando cobras la mensualidad al admin:
//   → Usas el StripeProcessor master (sin connectedAccountId)
//   → El dinero va a tu cuenta

import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';

import { Company } from '../entities/Company';
import { BadRequestError, NotFoundError } from '../utils/errors.util';

export class StripeConnectService {
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(private readonly em: EntityManager) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }

  // ── 1. URL de autorización OAuth ──────────────────────────────────────────

  /**
   * Genera la URL de Stripe Connect OAuth.
   * El admin hace clic en "Conectar con Stripe" y se redirige aquí.
   * El state es el companyId para identificar la empresa al volver.
   */
  getOAuthUrl(companyId: string, platform: 'web' | 'mobile' = 'web'): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: process.env.STRIPE_REDIRECT_URI!,
      state: `${companyId}__${platform}`,
      // Sugerir tipo de cuenta: Express es lo más sencillo para sub-merchants
      'suggested_capabilities[]': 'transfers',
    });

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  }

  // ── 2. Callback OAuth ─────────────────────────────────────────────────────

  /**
   * Intercambia el authorization code por el access token de la empresa
   * y lo guarda en la BD asociado a la Company.
   *
   * Llamar desde GET /stripe/callback?code=...&state=<companyId>
   */
  async handleOAuthCallback(code: string, state: string): Promise<Company> {
    if (!code) throw new BadRequestError('Authorization code is required');
    if (!state) throw new BadRequestError('State is required');

    // El state puede venir como "companyId" o "companyId__platform"
    const [companyId, _] = state.split('__');

    if (!companyId) throw new BadRequestError('Company ID is required');

    const company = await this.em.findOne(
      Company,
      { id: companyId },
      { filters: false }
    );
    if (!company) throw new NotFoundError('Company');

    // Intercambiar code por tokens
    const response = await this.stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    if (!response.stripe_user_id) {
      throw new BadRequestError('Failed to obtain Stripe account ID');
    }

    company.stripeAccountId = response.stripe_user_id;
    company.stripeAccessToken = response.access_token ?? undefined;
    company.stripeRefreshToken = response.refresh_token ?? undefined;
    company.stripeAccountStatus = 'active';
    company.stripeConnectedAt = new Date();

    await this.em.flush();

    console.log(
      `[StripeConnect] Company ${companyId} connected — account: ${response.stripe_user_id}`
    );

    return company;
  }

  // ── 3. Obtener account ID de la empresa ───────────────────────────────────

  /**
   * Devuelve el Stripe Account ID (acct_xxx) de una empresa.
   * Usarlo como connectedAccountId en ChargeParams.
   */
  async getConnectedAccountId(companyId: string): Promise<string> {
    const company = await this.em.findOne(Company, { id: companyId });
    if (!company) throw new NotFoundError('Company');

    if (!company.stripeAccountId || company.stripeAccountStatus !== 'active') {
      throw new BadRequestError(
        `Company "${company.name}" has not connected their Stripe account. ` +
          `Please ask the admin to connect via Settings → Payment Configuration.`
      );
    }

    return company.stripeAccountId;
  }

  // ── 4. Estado de conexión ─────────────────────────────────────────────────

  isConnected(company: Company): boolean {
    return (
      !!company.stripeAccountId && company.stripeAccountStatus === 'active'
    );
  }

  async getConnectionDetails(companyId: string): Promise<{
    isConnected: boolean;
    accountId?: string;
    status?: string;
    connectedAt?: Date;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }> {
    const company = await this.em.findOne(Company, { id: companyId });
    if (!company) throw new NotFoundError('Company');

    if (!company.stripeAccountId) {
      return { isConnected: false };
    }

    // Verificar el estado real en Stripe
    try {
      const account = await this.stripe.accounts.retrieve(
        company.stripeAccountId
      );
      return {
        isConnected: true,
        accountId: company.stripeAccountId,
        status: company.stripeAccountStatus,
        connectedAt: company.stripeConnectedAt,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      };
    } catch {
      return {
        isConnected: false,
        accountId: company.stripeAccountId,
        status: 'error',
      };
    }
  }

  // ── 5. Desconectar empresa ────────────────────────────────────────────────

  /**
   * Revoca el acceso OAuth y limpia los campos en la BD.
   */
  async disconnectCompany(companyId: string): Promise<Company> {
    const company = await this.em.findOne(Company, { id: companyId });
    if (!company) throw new NotFoundError('Company');

    if (company.stripeAccountId) {
      try {
        await this.stripe.oauth.deauthorize({
          client_id: process.env.STRIPE_CLIENT_ID!,
          stripe_user_id: company.stripeAccountId,
        });
      } catch (err: any) {
        // Si ya estaba desconectado en Stripe, continuar limpiando la BD
        console.warn(
          `[StripeConnect] Could not deauthorize account ${company.stripeAccountId}: ${err.message}`
        );
      }
    }

    company.stripeAccountId = undefined;
    company.stripeAccessToken = undefined;
    company.stripeRefreshToken = undefined;
    company.stripeAccountStatus = undefined;
    company.stripeConnectedAt = undefined;

    await this.em.flush();

    console.log(`[StripeConnect] Company ${companyId} disconnected`);

    return company;
  }
}
