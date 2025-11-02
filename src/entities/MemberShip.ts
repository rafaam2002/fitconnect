import { Entity, Enum, ManyToOne } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Company } from "./Company";
import { UserRoleEnum } from "../types/enums";

@Entity()
export class MemberShip extends BaseEntity {
    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Company)
    company!: Company;

    @Enum(() => UserRoleEnum)
    role!: UserRoleEnum;
}
