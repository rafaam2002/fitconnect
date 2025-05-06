import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  Property,
  t,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { PictureUrl } from "./PictureUrl";

@Entity()
export class Product extends BaseEntity {
  @Property({ type: t.string })
  name!: string;

  @Property({ type: t.string })
  description!: string;

  @Property({ type: t.float })
  price!: number;

  @OneToMany(() => PictureUrl, (picture) => picture.product, {
    cascade: [Cascade.REMOVE],
    eager: true,  
  })
  pictures = new Collection<PictureUrl>(this);

  constructor(product: Product) {
    super();
    this.name = product.name;
    this.description = product.description;
    this.price = product.price;
    this.pictures = product.pictures;
  }
}
