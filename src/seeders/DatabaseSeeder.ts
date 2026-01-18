import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { MessageSeeder } from './MessageSeeder';
import { PermissionSeeder } from './PermissionSeeder';
import { PlanSeeder } from './PlanSeeder';
import { PollSeeder } from './PollSeeder';
import { PollVoteSeeder } from './PollVoteSeeder';
import { ProductSeeder } from './ProductSeeder';
import { PromotionSeeder } from './PromotionSeeder';
import { ScheduleSeeder } from './ScheduleSeeder';
import { UserSeeder } from './UserSeeder';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [
      // CompanySeeder,
      UserSeeder,
      PromotionSeeder,
      ScheduleSeeder,
      PollSeeder,
      MessageSeeder,
      PollVoteSeeder,
      PermissionSeeder,
      PlanSeeder,
      ProductSeeder,
    ]);
  }
}
