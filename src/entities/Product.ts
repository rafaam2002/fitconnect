import {Cascade, Collection, Entity, Filter, ManyToOne, OneToMany, Property, t,} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";
import {PictureUrl} from "./PictureUrl";
import {Company} from "./Company";

@Entity()
@Filter({ name: 'company', cond: args => ({ company: args.companyId }), default: true })
export class Product extends BaseEntity {
    @Property({type: t.string})
    name: string;

    @Property({type: t.string})
    description: string;

    @Property({type: t.float})
    price: number;

    @OneToMany(() => PictureUrl, (picture) => picture.product, {
        cascade: [Cascade.REMOVE],
        eager: true,
    })
    pictures = new Collection<PictureUrl>(this);

    @ManyToOne(() => Company)
    company: Company;

    constructor(product: Product) {
        super();
        this.name = product.name;
        this.description = product.description;
        this.price = product.price;
        this.pictures = product.pictures;
    }
}
