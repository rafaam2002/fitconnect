import { Migrator } from "@mikro-orm/migrations";
import { Message } from "./entities/Message";
import { User } from "./entities/User";
import { Schedules_option } from "./entities/Schedules_option";
import { Schedule } from "./entities/Schedule";
import { Notification } from "./entities/Notification";
import { MikroORM } from "@mikro-orm/core";

export default {
  entities: [Message,User, Notification, Schedule, Schedules_option], // Aquí van las entidades o la ruta a ellas
  dbName: "fitconnect_db", // Nombre de la base de datos
  user: "postgres", // Usuario de PostgreSQL
  password: "Pececitos1$", // Contraseña
  host: "localhost", // Servidor
  port: 5432, // Puerto de PostgreSQL
  allowGlobalContext: true,
  driver: require("@mikro-orm/postgresql").PostgreSqlDriver, // Especifica el driver
  extensions: [Migrator],
};






