import {
  Cascade,
  Collection,
  Entity,
  Filter,
  ManyToMany,
  OneToMany,
  OneToOne,
  Property,
} from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { CompanyConfig } from './CompanyConfig';
import { PictureUrl } from './PictureUrl';
import { ScheduleOptions } from './ScheduleOptions';
import { User } from './User';

@Entity()
// @Filter({
//   name: 'validatedCompanies',
//   cond: () => ({ isValidated: true }),
//   default: true,
// })
@Filter({
  name: 'companyContext',
  cond: args => ({ id: args.companyId }),
  default: true,
})
export class Company extends BaseEntity {
  @Property({ length: 100 })
  name!: string;

  @Property({ unique: true })
  code: string;

  @Property()
  phoneNumber: string;

  @Property()
  email: string;

  @Property()
  address: string;

  @Property()
  isValidated: boolean = false;

  @ManyToMany(() => User, (user: User) => user.companies)
  users = new Collection<User>(this);

  @ManyToMany(() => User, (user: User) => user.pendingCompanies)
  pendingUsers = new Collection<User>(this);

  @OneToOne(() => PictureUrl, picture => picture.companyLogo, {
    nullable: true,
    owner: true,
    eager: true,
  })
  logo?: PictureUrl;

  @OneToMany(() => PictureUrl, picture => picture.company, {
    cascade: [Cascade.REMOVE],
  })
  pictures = new Collection<PictureUrl>(this);

  @OneToOne(() => ScheduleOptions, scheduleOptions => scheduleOptions.company, {
    nullable: true,
    owner: true,
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  scheduleOptions?: ScheduleOptions;

  @OneToOne(() => CompanyConfig, companyConfig => companyConfig.company, {
    nullable: true,
    owner: true,
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  companyConfig?: CompanyConfig;

  // ── Stripe Connect (OAuth) ────────────────────────────────────────
  // Credenciales de la cuenta Stripe propia de esta empresa.
  // Se obtienen via Stripe Connect OAuth cuando el admin conecta su cuenta.
  // Nunca se exponen al frontend.

  /** Stripe Account ID del admin (acct_xxx) — se usa como connectedAccountId en cobros */
  @Property({ nullable: true })
  stripeAccountId?: string;

  @Property({ nullable: true })
  stripeAccessToken?: string;

  @Property({ nullable: true })
  stripeRefreshToken?: string;

  @Property({ nullable: true })
  stripeAccountStatus?: string;

  @Property({ nullable: true })
  stripeConnectedAt?: Date;

  constructor(company: Partial<Company>) {
    super();
    this.name = company.name || '';
    this.code = company.code || '';
    this.address = company.address || '';
    this.phoneNumber = company.phoneNumber || '';
    this.email = company.email || '';
    this.logo = company.logo || undefined;
    this.pictures = company.pictures || new Collection<PictureUrl>(this);
    this.scheduleOptions = company.scheduleOptions || new ScheduleOptions();
    this.companyConfig = company.companyConfig || new CompanyConfig();

    this.scheduleOptions.company = this;
    this.companyConfig.company = this;
  }
}
