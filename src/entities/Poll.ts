import {
  Collection,
  Entity, EntityRepositoryType,
  ManyToMany,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import {CustomPollRepository} from "../customRepositories/pollRepository";
import {PollOptionType} from "../types";

@Entity({repository: ()=>CustomPollRepository})
export class Poll extends BaseEntity {
  [EntityRepositoryType]?: CustomPollRepository;
  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  options!: PollOptionType[];

  @ManyToOne(() => User)
  creator;

  @ManyToOne(() => User)
  adminUsers = new Collection<User>(this);
}
