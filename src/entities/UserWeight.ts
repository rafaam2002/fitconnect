import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
  t,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class UserWeight extends BaseEntity {
  @Property()
  weight!: number;

  @Property({ type: t.string })
  date!: string;

  @ManyToOne(() => User, { nullable: true })
  user!: User;
  

  constructor(userWeight: UserWeight) {
    super();
    this.date = userWeight.date;
    this.weight = userWeight.weight;
  }
}
