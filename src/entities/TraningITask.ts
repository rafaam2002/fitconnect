import { Collection, Entity, ManyToMany, Property, t } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class TrainingTask extends BaseEntity {
  @Property({ type: t.string })
  content!: string;

  @ManyToMany(() => User, (user) => user.trainingTasks)
  users = new Collection<User>(this);

  @Property()
  date!: Date;

  @Property()
  repeat: boolean = false;

  @Property({ nullable: true })
  dates: Date[] = [];

  constructor(task: TrainingTask) {
    super();
    this.content = task.content;
    this.date = task.date;
    this.repeat = task.repeat;
    this.dates = task.dates;
  }
}
