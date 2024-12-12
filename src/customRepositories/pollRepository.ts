import { EntityRepository } from '@mikro-orm/postgresql'; // or any other driver package
import { Poll } from '../entities/Poll';
import { PollAndSelection } from '../types/pollTypes';
import { User } from '../entities/User';

export class CustomPollRepository extends EntityRepository<User> {
  // Métodos personalizados...
  public async getPollsAndSelectionByUser(userId: number): Promise<[]> {
    return this.createQueryBuilder("p")
      .select("p.*") // Selecciona todas las columnas de Poll
      .join("p.pollOptionSelections", "pos") // Une con la tabla intermedia
      .where("pos.user_id = ?", [userId]) // Filtra por userId en la tabla intermedia
          .getResultList();
      
  }
}
