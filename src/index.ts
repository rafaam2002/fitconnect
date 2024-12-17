import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema/schema";
import resolvers from "./graphql/resolvers";
import { initORM } from "./utils/microOrmClient";
import { startStandaloneServer } from "@apollo/server/standalone";
import {
  Connection,
  EntityManager,
  IDatabaseDriver,
  MikroORM,
} from "@mikro-orm/core";
import * as dotenv from "dotenv";
import { authenticateUser } from "./middlewares/auth";
import cron from "node-cron";
import { ScheduleProgrammed } from "./entities/ScheduleProgrammed";
import { PollVote } from "./entities/PollVote";
import { Poll } from "./entities/Poll";
import { User } from "./entities/User";
import { tr } from "@faker-js/faker/.";
import { UserRol } from "./types/enums";
import { Schedules_option } from "./entities/Schedules_option";
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
      const authorization = req.headers.authorization || "";
      const em: EntityManager<IDatabaseDriver<Connection>> = orm.em.fork();
      const currentUser = await authenticateUser(em, authorization);

      return { em, currentUser };
    },
    listen: { port: 4000 },
  });

  console.log(`🚀 Servidor listo en ${url}`);

  await insertShedulesOption(orm.em.fork());

  await rafasProbes(orm.em.fork());

  cron.schedule("0 4 * * 0", () => {
    console.log(
      "Executing cron job at 04:00 on Sunday every week to create schedules from schedules programmed"
    );
    const em = orm.em.fork();
    const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
    scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
  });
};

startServer();

async function rafasProbes(em: EntityManager<IDatabaseDriver<Connection>>) {
  const UserRepo = em.getRepository(User);
  
  // const PollVoteRepo = em.getRepository(PollVote);
  // const PollRepo = em.getRepository(Poll);
  // const newPoll = PollRepo.create({
  //   title: "¿Te gusta el café?",
  //   options: ["Sí", "No"],
  //   admin: myUser,
  //   startDate: new Date(),
  //   endDate: new Date(),
  // });
  // const newPollVote = PollVoteRepo.create({
  //   poll: newPoll,
  //   user: myUser,
  //   optionSelected: 1,
  // });
  // const newPollVote2 = PollVoteRepo.create({
  //   poll: newPoll,
  //   user: myUser,
  //   optionSelected: 0,
  // });
  // try {
  
  //   await em.persistAndFlush(newPoll);
  //   await em.persistAndFlush(newPollVote);
  //   await em.persistAndFlush(newPollVote2);
  //   console.log("Voto de la encuesta guardado correctamente");
  //   console.log(
  //     newPollVote.poll.id,
  //     newPollVote.user.id,
  //     newPollVote2.poll.id,
  //     newPollVote2.user.id
  //   );
  // } catch (e) {
  //   console.log("Error al guardar el voto de la encuesta");
  //   console.log(e);
  // }
}
function insertShedulesOption(em: EntityManager<IDatabaseDriver<Connection>>) {
  const SchedulesOptionRepo = em.getRepository(Schedules_option);
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
