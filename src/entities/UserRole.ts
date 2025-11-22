import { Entity, Enum, Filter, ManyToOne, Unique } from "@mikro-orm/core";
import { UserRoleEnum } from "../types/enums";
import { BaseEntity } from "./BaseEntity";
import { Company } from "./Company";
import { User } from "./User";

@Filter({
  name: "companyContext",
  cond: (args) => ({ company: args.companyId }),
})
@Entity()
@Unique({ properties: ["user", "company"] }) // Ensure a user can have only one membership per user-company pair
export class MemberShip extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company)
  company!: Company;

  @Enum(() => UserRoleEnum)
  role!: UserRoleEnum;

  constructor(user: User, company: Company, role: UserRoleEnum) {
    super();
    this.user = user;
    this.company = company;
    this.role = role;
  }
}
