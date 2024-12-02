import {Entity, ManyToOne, Property} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";
import {User} from "./User";

@Entity()
export class Message extends BaseEntity {
//  @Field(() => String)
    @Property()
    message!: string;

    // @Field(() => Boolean)
    @Property()
    isFixed!: boolean;

//  @Field(() => Number, { nullable: true })
    @Property({nullable: true})
    fixedDuration?: number;

    @ManyToOne()
    sender!: User;
    @ManyToOne()
    receiver!: User;

    constructor(message: Message) {
        super();
        this.message = message.message;
        this.isFixed = message.isFixed;
        this.fixedDuration = message.fixedDuration;
        this.sender = message.sender;
        this.receiver = message.receiver;
    }
}
