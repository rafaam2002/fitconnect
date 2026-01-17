import { createServer } from 'http';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import bcrypt from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { useServer } from 'graphql-ws/use/ws';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';

import { Company } from './entities/Company';
import { User } from './entities/User';
import resolvers from './graphql/resolvers';
import { typeDefs } from './graphql/schema/schema';
import { storeNews } from './helpers/articles';
import { middleware } from './middlewares';
import { cronFunctions } from './utils/cron.util';
import { initORM } from './utils/mikro-orm.util';
import { createRetryingEntityManager } from './utils/orm-retry';
import { renderPage } from './utils/templates.util';
import { stripeWebhookRouter } from './webhooks/stripe.webhook';

// const {
//   ApolloServerPluginLandingPageLocalDefault,
// } = require("apollo-server-core");

dotenv.config();

const schema = makeExecutableSchema({ typeDefs, resolvers });
const path = require('path');

const app = express();
// ===== 1. MIDDLEWARE PARA INYECTAR EntityManager EN WEBHOOKS =====
const injectEntityManager = (orm: any) => {
  return (req: any, res: any, next: any) => {
    req.em = orm.em.fork(); // Inyectar EntityManager forked
    next();
  };
};

const httpServer = createServer(app);

const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    //ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
  csrfPrevention: true,
  cache: 'bounded',
});

const startServer = async () => {
  const orm = await initORM();

  const webhookCors = cors({
    origin: '*', // Stripe puede llamar desde diferentes IPs
    methods: ['POST'],
    allowedHeaders: ['content-type', 'stripe-signature'],
  });

  // ===== WEBHOOKS PRIMERO (ANTES DE express.json()) =====
  app.use('/webhooks', webhookCors);
  app.use('/webhooks', injectEntityManager(orm));
  app.use('/webhooks', stripeWebhookRouter);

  // ===== MIDDLEWARE GENERAL DESPUÉS =====
  app.use(cors());
  app.use(express.json());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  //Ruta de verificación de email
  app.get('/auth/verify-email', async (req, res) => {
    const token = req.query.token as string;
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };

      const em: EntityManager<IDatabaseDriver<Connection>> =
        createRetryingEntityManager(orm);
      const user = await em.findOne(User, { email: decodedToken.id });
      if (!user) {
        return res
          .status(400)
          .send(
            renderPage('Verificación fallida', 'Usuario no encontrado', false)
          );
      }
      user.isVerified = true;
      await em.persistAndFlush(user);
      // lógica que valida y activa al usuario
      // Puedes devolver HTML, o redirigir a tu frontend:
      return res
        .status(200)
        .send(
          renderPage(
            '¡Correo verificado!',
            'Gracias por confirmar tu email. Ya puedes entrar en la app.',
            true
          )
        );
    } catch (err: any) {
      return res
        .status(400)
        .send(
          renderPage(
            'Verificación fallida',
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  app.get('/admin/verify-company', async (req, res) => {
    const token = req.query.token as string;
    const verify = req.query.verify as string;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    const em: EntityManager<IDatabaseDriver<Connection>> =
      createRetryingEntityManager(orm);
    const company = await em.findOne(Company, {
      id: decodedToken.id,
    });
    if (!company) {
      throw new Error('Compañía no encontrada');
    }
    try {
      company.isValidated = verify === 'true';

      await em.persistAndFlush(company);
      // lógica que valida y activa la compañía
      // Puedes devolver HTML, o redirigir a tu frontend:

      if (verify === 'true')
        return res
          .status(200)
          .send(
            renderPage(
              '¡Compañía verificada!',
              'La compañía ha sido verificada correctamente.',
              true
            )
          );
      else
        return res
          .status(200)
          .send(
            renderPage(
              'Compañía rechazada',
              'La compañía ha sido rechazada y no podrá acceder a la plataforma.',
              true
            )
          );
    } catch (err: any) {
      return res
        .status(400)
        .send(
          renderPage(
            'Verificación fallida',
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  app.get('/auth/reset-password', async (req, res) => {
    const token = req.query.token as string;
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        password: string;
      };

      const em: EntityManager<IDatabaseDriver<Connection>> =
        createRetryingEntityManager(orm);
      const user = await em.findOne(User, { email: decodedToken.email });
      if (!user) {
        return res
          .status(400)
          .send(
            renderPage(
              'Cambio de contraseña fallido',
              'Usuario no encontrado',
              false
            )
          );
      }
      const saltRounds = 10;
      user.password = await bcrypt.hash(decodedToken.password, saltRounds); // Aseguramos que la contraseña se hashee correctamente
      await em.persistAndFlush(user);

      return res
        .status(200)
        .send(
          renderPage(
            '¡Cambio de contraseña completado!',
            'Podrás iniciar sesión con tu nueva contraseña temporal. Por favor, cámbiala en los ajustes de tu cuenta.',
            true
          )
        );
    } catch (err: any) {
      return res
        .status(400)
        .send(
          renderPage(
            'Verificación fallida',
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'GraphQL + Webhooks Server',
    });
  });

  // ===== APOLLO SERVER =====
  await apolloServer.start();
  app.use(
    '/',
    cors<cors.CorsRequest>({
      origin: '*',
      allowedHeaders: ['x-company-id', 'content-type', 'authorization'],
    }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const em = createRetryingEntityManager(orm); //createRetryingEntityManager(orm);
        const authorization = req.headers.authorization || '';
        const companyId = req.headers['x-company-id'] as string;
        const query = req.body?.query || '';

        //sacar query por consola para debug
        //  console.log("Query: ", query);

        // Operations that don't require an authenticated user
        const publicOperations = [
          'login',
          'loginWithGoogle',
          'loginWithId',
          'refreshToken',
          'getAccessToken',
          'createUser',
          'forgotPassword',
          'sendChangePasswordEmail',
          'verifyEmail',
        ];
        const isSetCompanyMe = query.toLowerCase().includes('setcompanyme');

        // If the query string contains a public operation, skip token authentication
        const isPublicOperation = publicOperations.some(op =>
          query.toLowerCase().includes(op.toLowerCase())
        );

        if (isPublicOperation) {
          try {
            return { em, currentUser: null };
          } catch (error) {
            console.error('Error in public operation context:', error);
            return { em, currentUser: null };
          }
        }
        return await middleware(em, authorization, companyId, true);
      },
    })
  );
  // ===== WEBSOCKET SERVER =====
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  useServer(
    {
      schema,
      context: async ctx => {
        // Extraer el token de los connectionParams
        const authorization =
          (ctx.connectionParams?.Authorization as string) || '';

        const companyId =
          (ctx.connectionParams?.['x-company-id'] as string) || '';

        // Crear un nuevo fork del EntityManager
        const em: EntityManager<IDatabaseDriver<Connection>> =
          createRetryingEntityManager(orm);

        return await middleware(em, authorization, companyId);
      },
    },
    wsServer
  );

  // ===== MANEJO DE ERRORES GLOBALES =====
  app.use((error: any, req: any, res: any, _: any) => {
    console.error('Global error handler:', error);
    if (req.path.startsWith('/webhooks')) {
      // Para webhooks, responder con formato que Stripe espera
      return res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  const port = process.env.PORT || 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/`);
    console.log(`🚀 GraphQL ready at http://localhost:${port}/`);
    console.log(
      `🚀 Webhooks ready at http://localhost:${port}/webhooks/stripe`
    );
    console.log(`🚀 Subscriptions ready at ws://localhost:${port}/graphql`);
    console.log(`🩺 Health check at http://localhost:${port}/health`);
  });

  cronFunctions(createRetryingEntityManager(orm));

  storeNews(createRetryingEntityManager(orm), 3, [1, 2, 3, 4]); //limt = 3 free plan
};

startServer();
