import { EntityRepository } from "@mikro-orm/postgresql";
import { Poll } from "../entities/Poll";

export class CustomPollRepository extends EntityRepository<Poll> {
  // Métodos personalizados...
  public async getPollsAndVotesByUser(
    userId: number | string
  ): Promise<[Poll] | any> {
    return this.createQueryBuilder("p")
      .select("p.*") // Selecciona todas las columnas de Poll
      .leftJoin("p.pollVotes", "pv") // Usa el nombre de la relación "pollVotes"
      .where("pv.user_id = ?", [userId]) // Filtra por userId en la tabla intermedia
      .getResultList();
  }
}
