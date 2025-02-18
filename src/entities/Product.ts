import { Entity, Property, t } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class Product extends BaseEntity {
  @Property({ type: t.string })
  name!: string;

  @Property({ type: t.string })
  description!: string;

  @Property({ type: t.float })
  price!: number;

  @Property({ nullable: true })
  pictures?: string[];

  constructor(product: Product) {
    super();
    this.name = product.name;
    this.description = product.description;
    this.price = product.price;
    this.pictures = product.pictures;
  }
}
