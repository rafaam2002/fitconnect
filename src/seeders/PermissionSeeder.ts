import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {PermissionService} from "../services/PermissionService";

export class PermissionSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const permissionService = new PermissionService(em);

        await permissionService.seedPermissions();
    }
}