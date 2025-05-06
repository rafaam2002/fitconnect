import {
  BeforeCreate,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
  t,
} from "@mikro-orm/core";
import { UserRol } from "../types/enums";
import { BaseEntity } from "./BaseEntity";
import { Schedule } from "./Schedule";
import { Message } from "./Message";
import { Notification } from "./Notification";
import { Poll } from "./Poll";
import { Promotion } from "./Promotion";
import { PollVote } from "./PollVote";
import bcrypt from "bcrypt";
import { Card } from "./Card";
import { Subscription } from "./Subscription";
import { TrainingTask } from "./TraningITask";
import { UserWeight } from "./UserWeight";
import { User } from "./User";
import { Product } from "./Product";

@Entity()
export class PictureUrl {
  @PrimaryKey({ type: t.string })
  name!: string;

  @Property({ type: t.text })
  url!: string;

  @OneToOne(() => User, (user) => user.pictureUrl, {
    nullable: true,
  })
  user?: User;

  @ManyToOne(() => Product, {
    nullable: true,
  })
  product?: Product;

  // @BeforeCreate()
  // validateRelations() {
  //   if (
  //     (!this.user && !this.product) ||
  //     (this.user && this.product)
  //   ) {
  //     throw new Error(
  //       "A PictureUrl must be related to either a User or a ProductPicture, but not both."
  //     );
  //   }
  // }

  constructor(picture: PictureUrl) {
    this.name = picture.name;
    this.url = picture.url;
    this.user = picture.user;
    // this.productPicture = picture.productPicture;
  }
}
