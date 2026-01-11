import {
  Entity,
  ManyToOne,
  OneToOne,
  Property,
  t,
  Unique,
} from '@mikro-orm/core';

import { BeforeDelete, BeforeUpdate, EventArgs } from '@mikro-orm/core';
import { deleteBucketPicture } from '../utils/s3client.util';
import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Product } from './Product';
import { User } from './User';

@Entity()
export class PictureUrl extends BaseEntity {
  @Unique()
  @Property({ type: t.string })
  name: string;

  @Property({ type: t.text })
  url: string;

  @OneToOne(() => User, user => user.pictureUrl, {
    nullable: true,
  })
  user?: User;

  @ManyToOne(() => Product, {
    nullable: true,
  })
  product?: Product;

  @OneToOne(() => Company, company => company.logo, {
    nullable: true,
  })
  companyLogo?: Company;

  @ManyToOne(() => Company, {
    nullable: true,
  })
  company?: Company;

  constructor(picture: PictureUrl) {
    super();
    this.name = picture.name;
    this.url = picture.url;
    this.user = picture.user;
    this.companyLogo = picture.companyLogo;
    // this.productPicture = picture.productPicture;
  }

  @BeforeUpdate()
  async deleteOldPicture(args: EventArgs<PictureUrl>) {
    const changeSet = args.changeSet;
    if (changeSet && changeSet.payload.name) {
      const originalEntity = args.em
        .getUnitOfWork()
        .getOriginalEntityData(this) as any;
      if (originalEntity && originalEntity.name) {
        try {
          await deleteBucketPicture(originalEntity.name);
        } catch (error) {
          console.error('Error deleting old picture from bucket', error);
        }
      }
    }
  }
  @BeforeDelete()
  async deletePicture() {
    try {
      await deleteBucketPicture(this.name);
    } catch (error) {
      console.error('Error deleting picture from bucket', error);
    }
  }
}
