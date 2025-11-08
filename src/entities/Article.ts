import { Entity, Filter, ManyToOne, PrimaryKey, Property, t } from "@mikro-orm/core";
import { Company } from "./Company";

@Entity()
@Filter({
  name: "company",
  cond: (args) => ({ company: args.companyId }),
  default: true,
})
export class Article {
  @PrimaryKey({ type: t.uuid })
  id: string;

  @Property({ type: t.string })
  title: string;

  @Property({ type: t.string })
  publishedAt: string;

  @Property({ type: t.string })
  description: string;

  @Property({ type: t.string })
  link: string;

  @Property({ type: t.string })
  image: string;

  @ManyToOne(() => Company, { nullable: true })
  company: Company;

  constructor(article: Article) {
    this.id = article.id;
    this.publishedAt = article.publishedAt;
    this.title = article.title;
    this.description = article.description;
    this.link = article.link;
    this.image = article.image;
  }
}
