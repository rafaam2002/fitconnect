import './sentry/instrument';

import { createServer } from 'node:http';
import path from 'node:path';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { EntityManager } from '@mikro-orm/core';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { useServer } from 'graphql-ws/use/ws';
import moment from 'moment-timezone';
import { WebSocketServer } from 'ws';

import { graphqlCorsOptions, webhookCorsOptions } from './config/cors.config';
import { registerBillingCrons } from './crons/billing.cron';
import resolvers from './graphql/resolvers';
import { typeDefs } from './graphql/schema/schema';
import { middleware } from './middlewares';
import { registerRoutes } from './routes';
import { BraintreeProcessor } from './services/braintree.processor';
import { CurrentUser } from './types/common.type';
import { cronFunctions } from './utils/cron.util';
import { initORM } from './utils/mikro-orm.util';
import { createRetryingEntityManager } from './utils/orm-retry';
import { createBraintreeWebhookRouter } from './webhooks/braintree.webhook';

// ─────────────────────────────────────────────
// CONFIGURACIÓN GLOBAL
// ─────────────────────────────────────────────

dotenv.config();
moment.tz.setDefault('Europe/Madrid');

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface MyContext {
  em: EntityManager;
  currentUser: CurrentUser | null;
  paymentProcessor: BraintreeProcessor; // ← tipo correcto, no la instancia
}

// ─────────────────────────────────────────────
// PROCESADOR DE PAGOS
// ─────────────────────────────────────────────

const braintree = new BraintreeProcessor({
  merchantId: process.env.BRAINTREE_MERCHANT_ID!,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
  sandbox: process.env.BRAINTREE_SANDBOX === 'true',
});

// ─────────────────────────────────────────────
// SCHEMA Y SERVIDOR APOLLO
// ─────────────────────────────────────────────

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = createServer(app);

const apolloServer = new ApolloServer<MyContext>({
  schema,
  csrfPrevention: true,
  cache: 'bounded',
  introspection: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async requestDidStart() {
        return {
          async didEncounterErrors(ctx) {
            for (const error of ctx.errors) {
              Sentry.withScope(scope => {
                if (ctx.contextValue?.currentUser) {
                  scope.setUser({
                    id: ctx.contextValue.currentUser.id,
                    email: ctx.contextValue.currentUser.email,
                  });
                }
                Sentry.captureException(error);
              });
            }
          },
        };
      },
    },
  ],
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Inyecta un EntityManager forked en req para los handlers de webhook.
 */
const injectEntityManager = (orm: any) => (req: any, _res: any, next: any) => {
  req.em = orm.em.fork();
  next();
};

/**
 * Construye el contexto de Apollo a partir de la request HTTP.
 * Las queries de introspección no requieren autenticación.
 */
const buildHttpContext =
  (orm: any) =>
  async ({ req }: { req: express.Request }): Promise<MyContext> => {
    const em = createRetryingEntityManager(orm);
    const query = req.body?.query ?? '';

    if (query.includes('__schema') || query.includes('IntrospectionQuery')) {
      return { em, currentUser: null, paymentProcessor: braintree };
    }

    const authorization = req.headers.authorization ?? '';
    const companyId = (req.headers['x-company-id'] as string) ?? '';

    const ctx = await middleware(em, query, authorization, companyId);
    return { ...ctx, paymentProcessor: braintree };
  };

/**
 * Construye el contexto de Apollo para conexiones WebSocket.
 */
const buildWsContext =
  (orm: any) =>
  async (ctx: any): Promise<MyContext> => {
    const authorization = (ctx.connectionParams?.Authorization as string) ?? '';
    const companyId = (ctx.connectionParams?.['x-company-id'] as string) ?? '';
    const em = createRetryingEntityManager(orm);

    const base = await middleware(em, '', authorization, companyId);
    return { ...base, paymentProcessor: braintree };
  };

// ─────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────

const startServer = async () => {
  const orm = await initORM();

  console.log('🔌 Host:     ', orm.config.get('host'));
  console.log('🗄️  Base de datos:', orm.config.get('dbName'));
  console.log('👤 Usuario:  ', orm.config.get('user'));

  // ── 1. Webhooks (antes de express.json — Braintree envía urlencoded) ──
  app.use('/webhooks', cors(webhookCorsOptions));
  app.use('/webhooks', injectEntityManager(orm));
  app.use('/webhooks', express.urlencoded({ extended: false }));
  app.use(createBraintreeWebhookRouter(orm, braintree));

  // ── 2. Middleware general ─────────────────────────────────────────────
  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  // ── 3. Rutas REST ─────────────────────────────────────────────────────
  registerRoutes(app, orm);

  // ── 4. Apollo Server ──────────────────────────────────────────────────
  await apolloServer.start();

  app.use(
    '/',
    cors<cors.CorsRequest>(graphqlCorsOptions),
    express.json(),
    expressMiddleware(apolloServer, { context: buildHttpContext(orm) })
  );

  // ── 5. WebSocket Server ───────────────────────────────────────────────
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  useServer({ schema, context: buildWsContext(orm) }, wsServer);

  // ── 6. Manejo global de errores ───────────────────────────────────────
  Sentry.setupExpressErrorHandler(app);

  app.use((error: any, req: any, res: any, _next: any) => {
    console.error('[Global error handler]', error);
    const status = 500;
    res.status(status).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  // ── 7. CRONs ──────────────────────────────────────────────────────────
  cronFunctions(createRetryingEntityManager(orm, true));
  registerBillingCrons(orm, braintree);

  // ── 8. Escuchar ───────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server     → http://localhost:${port}/`);
    console.log(`🚀 GraphQL    → http://localhost:${port}/`);
    console.log(`🚀 WS         → ws://localhost:${port}/graphql`);
    console.log(`🩺 Health     → http://localhost:${port}/health`);
  });
};

// ─────────────────────────────────────────────
// INICIO
// ─────────────────────────────────────────────

startServer();
