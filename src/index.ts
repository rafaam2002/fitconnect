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
import { registerPromotionCrons } from './crons/promotion.cron';
import resolvers from './graphql/resolvers';
import { typeDefs } from './graphql/schema/schema';
import { middleware } from './middlewares';
import { registerRoutes } from './routes';
import { PaymentProcessor } from './services/payment-processor.interface';
import { StripeProcessor } from './services/stripe.processor';
import { CurrentUser } from './types/common.type';
import { cronFunctions } from './utils/cron.util';
import { initORM } from './utils/mikro-orm.util';
import { createRetryingEntityManager } from './utils/orm-retry';
import { createStripeWebhookRouter } from './webhooks/stripe.webhook';

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
  paymentProcessor: PaymentProcessor;
}

// ─────────────────────────────────────────────
// PROCESADOR DE PAGOS — Stripe
// ─────────────────────────────────────────────

const stripeProcessor = new StripeProcessor({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
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

const injectEntityManager = (orm: any) => (req: any, _res: any, next: any) => {
  req.em = orm.em.fork();
  next();
};

const buildHttpContext =
  (orm: any) =>
  async ({ req }: { req: express.Request }): Promise<MyContext> => {
    const em = createRetryingEntityManager(orm);
    const query = req.body?.query ?? '';

    if (query.includes('__schema') || query.includes('IntrospectionQuery')) {
      return { em, currentUser: null, paymentProcessor: stripeProcessor };
    }

    const authorization = req.headers.authorization ?? '';
    const companyId = (req.headers['x-company-id'] as string) ?? '';

    const ctx = await middleware(em, query, authorization, companyId);
    return { ...ctx, paymentProcessor: stripeProcessor };
  };

const buildWsContext =
  (orm: any) =>
  async (ctx: any): Promise<MyContext> => {
    const authorization = (ctx.connectionParams?.Authorization as string) ?? '';
    const companyId = (ctx.connectionParams?.['x-company-id'] as string) ?? '';
    const em = createRetryingEntityManager(orm);

    const base = await middleware(em, '', authorization, companyId);
    return { ...base, paymentProcessor: stripeProcessor };
  };

// ─────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────

const startServer = async () => {
  const orm = await initORM();

  console.log('🔌 Host:     ', orm.config.get('host'));
  console.log('🗄️  Base de datos:', orm.config.get('dbName'));
  console.log('👤 Usuario:  ', orm.config.get('user'));

  // ── 1. Webhooks de Stripe (body crudo — antes de express.json) ────────
  app.use('/webhooks', cors(webhookCorsOptions));
  app.use('/webhooks', injectEntityManager(orm));
  // Stripe necesita el body como Buffer para verificar la firma
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(createStripeWebhookRouter(orm, stripeProcessor));

  // ── 2. Middleware general ─────────────────────────────────────────────
  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  // ── 3. Rutas REST ─────────────────────────────────────────────────────
  // injectEntityManager antes de registerRoutes para que authMiddleware
  // tenga acceso a req.em en las rutas de Stripe Connect OAuth
  app.use(injectEntityManager(orm));
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
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  // ── 7. CRONs ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'development') {
    cronFunctions(orm);
    registerBillingCrons(orm, stripeProcessor);
    registerPromotionCrons(orm);
  }

  // ── 8. Escuchar ───────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server  → http://localhost:${port}/`);
    console.log(`🚀 GraphQL → http://localhost:${port}/`);
    console.log(`🚀 WS      → ws://localhost:${port}/graphql`);
    console.log(`🩺 Health  → http://localhost:${port}/health`);
  });
};

startServer();
