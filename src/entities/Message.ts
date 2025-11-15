import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  Filter,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Company } from "./Company";

@Entity()
@Filter({
  name: "companyContext",
  cond: (args) => ({ company: args.companyId }),
  default: true,
})
export class Message extends BaseEntity {
  //  @Field(() => String)
  @Property()
  text: string;

  // @Field(() => Boolean)
  @Property()
  isFixed: boolean = false;

  //  @Field(() => Number, { nullable: true })
  @Property({ nullable: true })
  fixedEndDate?: Date;

  @ManyToOne(() => User, { nullable: true })
  fixedAdmin?: User;

  @ManyToOne(() => User)
  sender: User;

  // Relación ManyToOne con User (receiver)
  @ManyToOne(() => User, { nullable: true })
  receiver?: User | null;

  @Property()
  isForumMessage: boolean = false;

  @ManyToOne(() => Company)
  company: Company;

  constructor(message: Message) {
    super();
    this.text = message.text;
    this.isFixed = message.isFixed ?? false;
    this.fixedEndDate = message.fixedEndDate;
    this.sender = message.sender;
    this.receiver = message.receiver;
    this.company = message.company;
    this.isForumMessage = message.isForumMessage;
  }

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (this.sender === this.receiver) {
      throw new Error("Sender and receiver can not be the same.");
    }
  }
}
