import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./graphql/schema/schema";
import resolvers from "./graphql/resolvers";
import { initORM } from "./utils/microOrmClient";
import express from "express";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import dotenv from "dotenv";
import { authenticateUser } from "./middlewares/auth";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { useServer } from "graphql-ws/use/ws";
import { User } from "./entities/User";
import jwt from "jsonwebtoken";
import { renderPage } from "./utils/emailHtml";
import { cronFunctions } from "./utils/cron";
import bcrypt from "bcrypt";
import { storeNews } from "./utils/articles";
import { createRetryingEntityManager } from "./utils/orm-retry";


// const {
//   ApolloServerPluginLandingPageLocalDefault,
// } = require("apollo-server-core");

dotenv.config();

const schema = makeExecutableSchema({ typeDefs, resolvers });
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
app.use("/assets", express.static(path.join(__dirname, "assets")));

const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    //ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
  csrfPrevention: true,
  cache: "bounded",
});

const startServer = async () => {
  const orm = await initORM();

  //Ruta de verificación de email
  app.get("/auth/verify-email", async (req, res) => {
    const token = req.query.token as string;
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as {
        id: string;
      };

      const em: EntityManager<IDatabaseDriver<Connection>> = createRetryingEntityManager(orm);
      const user = await em.findOne(User, { email: decodedToken.id });
      if (!user) {
        return res
          .status(400)
          .send(
            renderPage("Verificación fallida", "Usuario no encontrado", false)
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
            "¡Correo verificado!",
            "Gracias por confirmar tu email. Ya puedes entrar en la app.",
            true
          )
        );
    } catch (err) {
      return res
        .status(400)
        .send(
          renderPage(
            "Verificación fallida",
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  app.get("/auth/reset-password", async (req, res) => {
    const token = req.query.token as {};
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as {
        email: string;
        purpose: string;
        password: string;
      };

      const em: EntityManager<IDatabaseDriver<Connection>> = createRetryingEntityManager(orm);
      const user = await em.findOne(User, { email: decodedToken.email });
      if (!user) {
        return res
          .status(400)
          .send(
            renderPage(
              "Cambio de contraseña fallido",
              "Usuario no encontrado",
              false
            )
          );
      }
      const saltRounds = 10;
      user.password = await bcrypt.hash(decodedToken.password, saltRounds); // Aseguramos que la contraseña se hashee correctamente
      await em.persistAndFlush(user);
      // lógica que valida y activa al usuario
      // Puedes devolver HTML, o redirigir a tu frontend:
      return res
        .status(200)
        .send(
          renderPage(
            "¡Cambio de contraseña completado!",
            "Podrás iniciar sesión con tu nueva contraseña temporal. Por favor, cámbiala en los ajustes de tu cuenta.",
            true
          )
        );
    } catch (err) {
      return res
        .status(400)
        .send(
          renderPage(
            "Verificación fallida",
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  await apolloServer.start();

  app.use(
    "/",
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const em = createRetryingEntityManager(orm);
        const authorization = req.headers.authorization || "";
        const query = req.body?.query || "";
        //sacar query por consola para debug
        // console.log("Query: ", query);

        // Operations that don't require an authenticated user
        const publicOperations = [
          "login",
          "loginWithGoogle",
          "loginWithId",
          "refreshToken",
          "getAccessToken",
          "createUser",
          "forgotPassword",
          "sendChangePasswordEmail",
          "verifyEmail",
        ];

        // If the query string contains a public operation, skip token authentication
        const isPublicOperation = publicOperations.some((op) =>
          query.toLowerCase().includes(op.toLowerCase())
        );

        if (isPublicOperation) {
          return { em, currentUser: null };
        }

        const currentUser = await authenticateUser(em, authorization);
        return { em, currentUser };
      },
    })
  );

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        // Extraer el token de los connectionParams
        const authorization =
          (ctx.connectionParams?.Authorization as string) || "";
        // Crear un nuevo fork del EntityManager
        const em: EntityManager<IDatabaseDriver<Connection>> = createRetryingEntityManager(orm);
        // Autenticar al usuario según el token recibido
        const currentUser = await authenticateUser(em, authorization);
        // Retornar el contexto con el currentUser
        return { em, currentUser };
      },
    },
    wsServer
  );

  const port = 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${port}/graphql`);
  });

  cronFunctions(createRetryingEntityManager(orm));

  storeNews(createRetryingEntityManager(orm), 3, [1, 2, 3, 4]); //limt = 3 free plan
};

startServer();
