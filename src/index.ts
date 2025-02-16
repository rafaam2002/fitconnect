import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs } from "./graphql/schema/schema";
import resolvers from "./graphql/resolvers";
import { initORM } from "./utils/microOrmClient";
import { createServer } from "http";
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
dotenv.config();

type MyContext = {
  token?: string;
};

// Required logic for integrating with Express
const app = express();
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = http.createServer(app);

// Same ApolloServer initialization as before, plus the drain plugin
// for our httpServer.
const server = new ApolloServer<MyContext>({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
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
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );

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
};

startServer();

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
