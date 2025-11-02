import { Entity, Enum, ManyToOne, Unique } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Company } from "./Company";
import { UserRoleEnum } from "../types/enums";

@Entity()
@Unique({ properties: ['user', 'company'] }) // Ensure a user can have only one membership per user-company pair
export class MemberShip extends BaseEntity {
    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Company)
    company!: Company;

    @Enum(() => UserRoleEnum)
    role!: UserRoleEnum;
}
