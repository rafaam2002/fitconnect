import { MikroORM } from "@mikro-orm/core";
import { User } from "./entities/User";
import { UserRol } from "./types/enums";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./graphql/schema";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserResolver } from "./graphql/resolvers/UserResolver";
import { initORM } from "./utils/microOrmClient";


 
(async () => {
  try {
    const orm = await initORM();
    await  orm.getMigrator().up();
     const resolvers = {
       Query: {
         ...UserResolver(orm).Query,
       },
      //  Mutation: {
      //    ...UserResolver(orm).Mutation,
      //  },
     };
    console.log("Connected to the database");

    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
    });
    // const { url } = await startStandaloneServer(apolloServer, {
    //   listen: { port: 4000 },
    //   context: async ({ req, res }) => ({ em: orm.em }),
    // });

    const app = express();

    await apolloServer.start();

    app.use(
      "/graphql",
      cors<cors.CorsRequest>(),
      express.json(),
      expressMiddleware(apolloServer)
    );

    // app.get("/", (req, res) => {
    //   res.send("Hello World");
    // });

    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    if (error.code === "28P01") {
      console.error("Incorrect password");
    } else {
      console.error(error);
    }
  }
})();
