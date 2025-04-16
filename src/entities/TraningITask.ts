import { Collection, Entity, ManyToMany, ManyToOne, Property, t } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class TrainingTask extends BaseEntity {
  @Property({ type: t.string })
  content!: string;

  @ManyToOne(() => User, { nullable: true })
  user!: User;

  @Property()
  date!: Date;

  @Property()
  repeat: boolean = false;

  @Property({ nullable: true })
  dates: Date[] = [];

  constructor(task: TrainingTask) {
    super();
    this.content = task.content;
    this.repeat = task.repeat;
    this.dates = task.dates;
  }
}
