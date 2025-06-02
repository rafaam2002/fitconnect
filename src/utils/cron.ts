import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { storeNews } from "./articles";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { setStats } from "./users";
import cron from "node-cron";
import { updatePictureUrls } from "./createPresignedUrls";

export const cronFunctions = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  cron.schedule(
    "0 4 * * *",
    async () => {
      console.log("🚀 Iniciando tareas programadas...");
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        await storeNews(em, 3, [1, 2, 3, 4]);

        const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
        scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();

        await setStats(em);
      } catch (error) {
        console.error("Error al ejecutar la tarea programada:", error);
      }
      console.log("✅ Tareas programadas completadas.");
    },
    {
      timezone: "Europe/Madrid", // Ajusta según tu zona horaria
    }
  );

  console.log(
    "📅 Tarea programada para ejecutarse todos los días a medianoche."
  );
};


export const makeCronPresignedUrls = (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  cron.schedule("0 */3 * * *", () => {
    console.log("Executing cron job every 3 hours to update presigned urls");
    updatePictureUrls(em);
  });
};