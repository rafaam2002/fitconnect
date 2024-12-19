import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class Promotion extends BaseEntity {
  @Property()
  title!: string;

  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  price!: number;

  @Property({ nullable: true })
  picture: string;

  @Property()
  description!: string;

  @ManyToMany(() => User, (user) => user.promotions)
  users = new Collection<User>(this);
}
