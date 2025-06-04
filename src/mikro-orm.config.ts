import { Migrator } from "@mikro-orm/migrations";
import { Message } from "./entities/Message";
import { User } from "./entities/User";
import { ScheduleOptions } from "./entities/ScheduleOptions";
import { Schedule } from "./entities/Schedule";
import { Notification } from "./entities/Notification";
import { SeedManager } from "@mikro-orm/seeder/SeedManager";
import { Product } from "./entities/Product";
import { Article } from "./entities/Article";
import dotenv from "dotenv";
dotenv.config();

export default {
  entities: [Message, User, Notification, Schedule, ScheduleOptions, Product, Article],
  dbName: process.env.DB_NAME || "fitconnect_db",
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "Pececitos1$", 
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  allowGlobalContext: true,
  driver: require("@mikro-orm/postgresql").PostgreSqlDriver,
  extensions: [Migrator, SeedManager],
  //subscribers : [PollVoteSubscriber],
  //    EntityRepository: [CustomPollRepository],
};

