import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./graphql/schema/schema";
import resolvers from "./graphql/resolvers";
import { initORM } from "./utils/microOrmClient";
import express from "express";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import * as dotenv from "dotenv";
import { authenticateUser } from "./middlewares/auth";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import http from "http";
import { ScheduleOptions } from "./entities/ScheduleOptions";
import { ScheduleProgrammed } from "./entities/ScheduleProgrammed";
import cron from "node-cron";
import axios from "axios";
import { Article } from "./entities/Article";
// import { WebSocketServer } from "ws";
// import { useServer } from "graphql-ws/use/ws";

dotenv.config();

const schema = makeExecutableSchema({ typeDefs, resolvers });
// Required logic for integrating with Express
const app = express();
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = http.createServer(app);

// const wsServer = new WebSocketServer({
//   server: httpServer,
//   path: "/subscriptions",
// });

// const wsServerCleanup = useServer({ schema }, wsServer);

// Same ApolloServer initialization as before, plus the drain plugin
// for our httpServer.
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for the WebSocket server.
    // {
    //   async serverWillStart() {
    //     return {
    //       async drainServer() {
    //         await wsServerCleanup.dispose();
    //       },
    //     };
    //   },
    // },
  ],
});

const startServer = async () => {
  const orm = await initORM();

  // Ensure we wait for our server to start
  await server.start();

  // Set up our Express middleware to handle CORS, body parsing,
  // and our expressMiddleware function.
  app.use(
    "/",
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authorization = req.headers.authorization || "";
        const em: EntityManager<IDatabaseDriver<Connection>> = orm.em.fork();
        const currentUser = await authenticateUser(em, authorization);
        return { em, currentUser };
      },
    })
  );

  // Modified server startup
  // await new Promise<void>((resolve) =>
  //   httpServer.listen({ port: 4000 }, resolve)
  // );
  const port = 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${port}/graphql`);
  });

  await insertShedulesOption(orm.em.fork());

  cron.schedule("0 4 * * 0", () => {
    console.log(
      "Executing cron job at 04:00 on Sunday every week to create schedules from schedules programmed"
    );
    const em = orm.em.fork();
    const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
    scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
  });
  console.log(`🚀 Server ready at http://localhost:4000/`);
  const limit = 3; // max limit for free plan
  const pages = [1, 2, 3, 4];
  storeDaylyNews(orm.em.fork(), limit, pages);
  // storeNews(orm.em.fork(), limit, pages);
};

startServer();

// ...
// Hand in the schema we just created and have the
// WebSocketServer start listening.
// const serverCleanup = useServer({ schema }, wsServer);

function insertShedulesOption(em: EntityManager<IDatabaseDriver<Connection>>) {
  const SchedulesOptionRepo = em.getRepository(ScheduleOptions);
  const schedulesOption = SchedulesOptionRepo.create({
    maxActiveReservations: 3,
    cancellationDeadline: 30,
    maxStrikesBeforePenalty: 3,
    penaltyDuration: 7,
    maxAdvanceBookingDays: 7,
  });
  try {
    em.persistAndFlush(schedulesOption);
  } catch (e) {
    console.log("Error inserting Schedules Option");
    console.log(e);
  }
}

async function fetchBoxingNews(limit: number, page: number) {
  try {
    const response = await axios.get("https://api.thenewsapi.com/v1/news/all", {
      params: {
        api_token: "2Z7NKRiCCOlyW1vRW9051aBRqCC9TtoI3d5zSg2e",
        categories: "sports",
        sort: "published_at_desc",
        language: "es",
        search: "boxeo",
        limit,
        page,
      },
    });

    const newsData = response;
    return newsData.data;
  } catch (error) {
    console.error("Error fetching boxing news", error);
  }
}

async function storeNews(
  em: EntityManager<IDatabaseDriver<Connection>>,
  limit: number,
  pages: number[]
) {
  try {
    // Realizar todas las peticiones en paralelo
    const responses = await axios.all(
      pages.map((page) => fetchBoxingNews(limit, page))
    );

    // Obtener el repositorio de artículos
    const articleRepo = em.getRepository(Article);

    // Procesar cada respuesta y almacenar las noticias en la base de datos
    for (const response of responses) {
      if (response && response.data) {
        for (const newsItem of response.data) {
          // console.log(newsItem)
          const article = articleRepo.create({
            id: newsItem.uuid,
            title: newsItem.title,
            description: newsItem.description,
            publishedAt: newsItem.published_at,
            link: newsItem.url,
            image: newsItem.image_url,
          });
          await em.persistAndFlush(article); // Guardar en la base de datos
        }
      }
    }
    console.log("Noticias guardadas correctamente.");
  } catch (error) {
    console.error("Error al almacenar las noticias:", error);
  }
}

async function storeDaylyNews(
  em: EntityManager<IDatabaseDriver<Connection>>,
  limit: number,
  pages: number[]
) {
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("🚀 Iniciando tarea programada de noticias...");
      await storeNews(em, limit, pages);
    },
    {
      timezone: "Europe/Madrid", // Ajusta según tu zona horaria
    }
  );

  console.log(
    "📅 Tarea programada para ejecutarse todos los días a medianoche."
  );
}
