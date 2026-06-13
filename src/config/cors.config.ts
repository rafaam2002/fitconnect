// config/cors.config.ts

import cors from 'cors';

const ALLOWED_ORIGINS = new Set(
  [
    process.env.FRONTEND_URL, // ej: https://app.tudominio.com
    process.env.ADMIN_URL, // ej: https://admin.tudominio.com
  ].filter(Boolean)
);

/**
 * Valida que el origen de la request esté en la lista de permitidos.
 * En desarrollo acepta localhost en cualquier puerto.
 */
export const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  // Requests sin origen (mobile apps, Postman, server-to-server) — permitir
  if (!origin) return callback(null, true);

  const isDev = true;
  const isLocalhost =
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://192.168.1.65');

  if ((isDev && isLocalhost) || ALLOWED_ORIGINS.has(origin)) {
    return callback(null, true);
  }

  callback(new Error(`CORS: origin ${origin} not allowed`));
};

export const graphqlCorsOptions: cors.CorsOptions = {
  origin: corsOriginValidator,
  allowedHeaders: [
    'x-company-id',
    'content-type',
    'authorization',
    'sentry-trace',
    'baggage',
  ],
  credentials: true,
};

export const webhookCorsOptions: cors.CorsOptions = {
  // Los webhooks de Braintree vienen de sus servidores — origen variable pero conocido
  // No necesitan credenciales ni headers custom
  origin: corsOriginValidator,
  methods: ['POST'],
  allowedHeaders: ['content-type'],
};
