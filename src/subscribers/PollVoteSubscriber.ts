import { EventSubscriber, EntityManager, EventArgs } from "@mikro-orm/core";
import { PollVote } from "../entities/PollVote";
import { EntityRepository } from "@mikro-orm/postgresql";
import { Poll } from "../entities/Poll";

export class PollVoteSubscriber implements EventSubscriber<PollVote> {
  async beforeCreate(args: EventArgs<PollVote>): Promise<void> {
    //   const pollVote = args.entity;
    //   console.log("Args");
    //   console.log(args);
    // console.log(`Before Create: Validando voto de ${pollVote.user}`);
    // const pollVoteRepo = args.em.getRepository(PollVote);
    // // Realiza la validación en la base de datos
    // const existingVote = await pollVoteRepo.findOne({
    //   poll: pollVote.poll.id,
    //   user: pollVote.user.id,
    // });

    // if (existingVote) {
    //   throw new Error("El usuario ya ha votado en esta encuesta");
      // }
      console.log("Llama PollVoteSubscriber beforeCreate");
  }

  /**
   * Evento que se ejecuta antes de actualizar una entidad.
   */
  async beforeUpdate(args: EventArgs<PollVote>): Promise<void> {
    const user = args.entity;
    //console.log(`Before Update: Validando voto de ${pullvote.user}`);
    // Añadir lógica si necesitas validar antes de actualizar
  }
}
