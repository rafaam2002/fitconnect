import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema";
import resolvers from "./graphql/resolvers";
import { initORM } from "./utils/microOrmClient";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import * as dotenv from "dotenv";
import { User } from "./entities/User";
import { UserRol } from "./types/enums";
import {authenticateUser} from "./middlewares/auth";
dotenv.config();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  const orm = await initORM();
  /*await orm.getMigrator().up();
  await orm.schema.refreshDatabase();*/

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      const authorization = req.headers.authorization || '';
      const em:EntityManager<IDatabaseDriver<Connection>> = orm.em.fork();
      const currentUser = await authenticateUser(em, authorization);
      return { em, currentUser };
    },
    listen: { port: 4000 },
  });

  console.log(`🚀 Servidor listo en ${url}`);
};

startServer();
