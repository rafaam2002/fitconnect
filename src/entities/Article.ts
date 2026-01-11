import { Entity, PrimaryKey, Property, t } from '@mikro-orm/core';

@Entity()
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

  constructor(article: Article) {
    this.id = article.id;
    this.publishedAt = article.publishedAt;
    this.title = article.title;
    this.description = article.description;
    this.link = article.link;
    this.image = article.image;
  }
}
