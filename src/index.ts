import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema";
import resolvers from "./schema";
import { initORM } from "./utils/microOrmClient";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import * as dotenv from "dotenv";
import { User } from "./entities/User";
import { UserRol } from "./types/enums";
dotenv.config();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  const orm = await initORM();
  await orm.getMigrator().up();
  await orm.schema.refreshDatabase();

  const user = orm.em.create(User, {
      name: "John Doe",
    surname: "Doe",
    email: "n",
    password: "n",
    nickname: "n",
    isActive: true,
    isBlocked: false,
    rol: "standard" as UserRol,
  });
    
  await orm.em.persistAndFlush(user);

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      const em: EntityManager<IDatabaseDriver<Connection>> = orm.em.fork();
      return { em };
    },
    listen: { port: 4000 },
  });

  console.log(`🚀 Servidor listo en ${url}`);
};

startServer();
