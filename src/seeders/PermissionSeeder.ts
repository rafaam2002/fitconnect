import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { PermissionService } from '../services/permission.service';

export class PermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const permissionService = new PermissionService(em);

    await permissionService.seedPermissions();
  }
}
