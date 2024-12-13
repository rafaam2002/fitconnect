import { EntityRepository } from '@mikro-orm/postgresql';
import {Poll} from "../entities/Poll";

export class CustomPollRepository extends EntityRepository<Poll> {
  // Métodos personalizados...
  public async getPollsAndSelectionByUser(userId: number|string): Promise<[Poll]|any> {
    return this.createQueryBuilder("p")
      .select("p.*") // Selecciona todas las columnas de Poll
      .join("p.pollOptionSelections", "pos") // Une con la tabla intermedia
      .where("pos.user_id = ?", [userId]) // Filtra por userId en la tabla intermedia
          .getResultList();

  }
}
