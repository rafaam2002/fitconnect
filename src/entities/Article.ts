import { Entity, Property, t } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class Article extends BaseEntity {
  @Property({ type: t.string })
  title!: string;

  @Property({ type: t.string })
  description!: string;

  @Property({ type: t.string })
  link!: string;

  @Property({ nullable: true })
  image?: string;

  constructor(article: Article) {
    super();
    this.title = article.title;
    this.description = article.description;
    this.link = article.link;
    this.image = article.image;
  }
}
