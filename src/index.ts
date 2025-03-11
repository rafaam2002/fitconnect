import {ApolloServer} from "@apollo/server";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {typeDefs} from "./graphql/schema/schema";
import resolvers from "./graphql/resolvers";
import {initORM} from "./utils/microOrmClient";
import express from "express";
import cors from "cors";
import {expressMiddleware} from "@apollo/server/express4";
import {Connection, EntityManager, IDatabaseDriver} from "@mikro-orm/core";
import * as dotenv from "dotenv";
import {authenticateUser} from "./middlewares/auth";
import {ApolloServerPluginDrainHttpServer} from "@apollo/server/plugin/drainHttpServer";
import {WebSocketServer} from "ws";
import {ScheduleOptions} from "./entities/ScheduleOptions";
import {ScheduleProgrammed} from "./entities/ScheduleProgrammed";
import cron from "node-cron";
import axios from "axios";
import {Article} from "./entities/Article";
import bodyParser from 'body-parser'
import {createServer} from 'http'
import {useServer} from "graphql-ws/use/ws";

dotenv.config();

const schema = makeExecutableSchema({typeDefs, resolvers});

const app = express()
app.use(cors())
app.use(bodyParser.json())

const httpServer = createServer(app);

const apolloServer = new ApolloServer({
    schema,
    plugins: [
        ApolloServerPluginDrainHttpServer({httpServer}),
    ],
});

const startServer = async () => {
    const orm = await initORM();

    await apolloServer.start();

    app.use(
        "/",
        cors<cors.CorsRequest>(),
        express.json(),
        expressMiddleware(apolloServer, {
            context: async ({req}) => {
                const authorization = req.headers.authorization || "";
                const em: EntityManager<IDatabaseDriver<Connection>> = orm.em.fork();
                const currentUser = await authenticateUser(em, authorization);
                return {em, currentUser};
            },
        })
    );

    const wsServer = new WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });

    useServer({ schema }, wsServer);

    const port = 4000;
    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://localhost:${port}/`);
        console.log(`🚀 Subscriptions ready at ws://localhost:${port}/graphql`);
    });

    await insertShedulesOption(orm.em.fork());

    makeCron(orm);
    populateNews(orm);
    // storeNews(orm.em.fork(), limit, pages);
};

startServer();

const makeCron = (orm) => {
    cron.schedule("0 4 * * 0", () => {
        console.log(
            "Executing cron job at 04:00 on Sunday every week to create schedules from schedules programmed"
        );
        const em = orm.em.fork();
        const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
        scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
    });
}

const populateNews = (orm) => {
    const limit = 3; // max limit for free plan
    const pages = [1, 2, 3, 4];
    storeDaylyNews(orm.em.fork(), limit, pages);
}

const insertShedulesOption = (em: EntityManager<IDatabaseDriver<Connection>>) => {
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

const fetchBoxingNews = async (limit: number, page: number) => {
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

const storeNews = async (
    em: EntityManager<IDatabaseDriver<Connection>>,
    limit: number,
    pages: number[]
) => {
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

const storeDaylyNews = async (
    em: EntityManager<IDatabaseDriver<Connection>>,
    limit: number,
    pages: number[]
) => {
    cron.schedule(
        "0 0 * * *",
        async () => {
            console.log("🚀 Iniciando tarea programada de noticias...");
            // Aquí debes pasar `em` desde tu contexto de MikroORM
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
