import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {PlanFactory} from "../factories/PlanFactory";

export class PlanSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        new PlanFactory(em).make(3);
    }
}
