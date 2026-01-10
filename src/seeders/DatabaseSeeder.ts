import type {EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import {UserSeeder} from "./UserSeeder";
import {PollSeeder} from "./PollSeeder";
import {MessageSeeder} from "./MessageSeeder";
import {PollVoteSeeder} from "./PollVoteSeeder";
import {PromotionSeeder} from "./PromotionSeeder";
import {ScheduleSeeder} from "./ScheduleSeeder";
import {ProductSeeder} from "./ProductSeeder";
import {PermissionSeeder} from "./PermissionSeeder";

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
            // PlanSeeder,
            ProductSeeder,
            PermissionSeeder,
        ]);
    }
}
