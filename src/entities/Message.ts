import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

@Entity()
export class Message extends BaseEntity {
  //  @Field(() => String)
  @Property()
  text!: string;

  // @Field(() => Boolean)
  @Property()
  isFixed!: boolean;

  //  @Field(() => Number, { nullable: true })
  @Property({ nullable: true })
  fixedEndDate?: Date;

  @ManyToOne(() => User)
  sender!: User;

  // Relación ManyToOne con User (receiver)
  @ManyToOne(() => User)
  receiver: User;

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (this.sender === this.receiver) {
      throw new Error("Sender and receiver can not be the same.");
    }
  }

  constructor(message: Message) {
    super();
    this.text = message.text;
    this.isFixed = message.isFixed;
    this.fixedEndDate = message.fixedEndDate;
    this.sender = message.sender;
    this.receiver = message.receiver;
  }
}
