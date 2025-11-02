import { BaseEntity } from "./BaseEntity";
import { Collection, Entity, OneToMany, Property } from "@mikro-orm/core";
import { MemberShip } from "./MemberShip";

@Entity()
export class Company extends BaseEntity {
  @Property({ length: 100 })
  name!: string;

  @Property({ nullable: true })
  logoUrl?: string;

  @Property({ nullable: true })
  address?: string;

  @OneToMany(() => MemberShip, (memberShip) => memberShip.company)
  memberships = new Collection<MemberShip>(this);
}
