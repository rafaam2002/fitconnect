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

import { User } from "./User";
import { Product } from "./Product";

@Entity()
export class PictureUrl {
  @PrimaryKey({ type: t.string })
  name: string;

  @Property({ type: t.text })
  url: string;

  @OneToOne(() => User, (user) => user.pictureUrl, {
    nullable: true,
  })
  user?: User;

  @ManyToOne(() => Product, {
    nullable: true,
  })
  product?: Product;

  constructor(picture: PictureUrl) {
    this.name = picture.name;
    this.url = picture.url;
    this.user = picture.user;
    // this.productPicture = picture.productPicture;
  }
}
