import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { storeNews } from "./articles";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import cron from "node-cron";
import { updatePictureUrls } from "./createPresignedUrls";
import { setNotActiveUsers } from "./users";

export const cronFunctions = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  cron.schedule(
    "0 4 * * *", // Ejecuta a las 4:00 AM todos los días
    async () => {
      console.log("🚀 Iniciando tareas programadas...");
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        await storeNews(em, 3, [1, 2, 3, 4]);

        const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
        
        scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();

        updatePictureUrls(em);

        await setNotActiveUsers(em);
      } catch (error) {
        console.error("Error al ejecutar la tarea programada:", error);
      }
      console.log("✅ Tareas programadas completadas.");
    },
    {
      timezone: "Europe/Madrid", // Ajusta según tu zona horaria
    }
  );

  cron.schedule(
    "0 3 * * 0", // Ejecuta a las 3:00 AM todos los domingos
    async () => {
      console.log(
        "🚀 Iniciando tarea programada (creacion de horarios programados)..."
      );
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
        scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
      } catch (error) {
        console.error(
          "Error al ejecutar la tarea programada (Creacion horarios programados):",
          error
        );
      }
      console.log(
        "✅ Tarea programada completada  (Creacion horarios programados)."
      );
    },
    {
      timezone: "Europe/Madrid", // Ajusta según tu zona horaria
    }
  );

  console.log("📅 Tarea programada para ejecutarse cada domingo a las 3AM.");
};
