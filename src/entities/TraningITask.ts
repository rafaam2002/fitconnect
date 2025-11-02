import {Entity, ManyToOne, Property, t,} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";
import {User} from "./User";
import {Company} from "./Company";

@Entity()
export class TrainingTask extends BaseEntity {
    @Property({type: t.string})
    content!: string;

    @ManyToOne(() => User, {nullable: true})
    user: User;

    @Property()
    repeat: boolean = false;

    @Property({nullable: true})
    date: string;

    @ManyToOne(() => Company, {nullable: true})
    company: Company;

    constructor(task: TrainingTask) {
        super();
        this.content = task.content;
        this.repeat = task.repeat;
        this.date = task.date;
        this.user = task.user;
    }
}
