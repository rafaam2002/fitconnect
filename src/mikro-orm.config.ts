import { Migrator } from "@mikro-orm/migrations";
import { Message } from "./entities/Message";
import { User } from "./entities/User";
import { Schedules_option } from "./entities/Schedules_option";
import { Schedule } from "./entities/Schedule";
import { Notification } from "./entities/Notification";
import { MikroORM } from "@mikro-orm/core";
import { SeedManager } from "@mikro-orm/seeder/SeedManager";
import { EntityRepository } from "@mikro-orm/postgresql";
import { CustomPollRepository } from "./customRepositories/pollRepository";

export default {
  entities: [Message, User, Notification, Schedule, Schedules_option],
  dbName: process.env.DB_NAME || "fitconnect_db",
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "Pececitos1$",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  allowGlobalContext: true,
  driver: require("@mikro-orm/postgresql").PostgreSqlDriver,
  extensions: [Migrator, SeedManager],
//    EntityRepository: [CustomPollRepository],
};






