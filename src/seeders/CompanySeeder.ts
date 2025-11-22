import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {Plan, PlanInterval} from "../entities/Plan";
import {CompanyFactory} from "../factories/CompanyFactory";

export class CompanySeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        new CompanyFactory(em).make(3)
    }
}