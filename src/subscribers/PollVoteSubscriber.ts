import { EventArgs, EventSubscriber } from '@mikro-orm/core';

import { PollVote } from '../entities/PollVote';

export class PollVoteSubscriber implements EventSubscriber<PollVote> {
  /**
   * Evento que se ejecuta antes de actualizar una entidad.
   */
  async beforeUpdate(args: EventArgs<PollVote>): Promise<void> {
    console.log(args);
  }
}
