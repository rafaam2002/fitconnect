import { Entity, OneToOne, OptionalProps, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';

@Entity()
export class ScheduleOptions extends BaseEntity {
  [OptionalProps]?:
    | 'created_at'
    | 'updated_at'
    | 'isActive'
    | 'isBlocked'
    | 'maxActiveReservations'
    | 'bookingCutoffMinutes'
    | 'maxAdvanceBookingDays'
    | 'sameDayBookingAllowed'
    | 'fullOpenHours';

  @Property({ default: 1 })
  maxActiveReservations: number;

  // @Property({ default: 30 }) // in minutes
  // cancellationDeadline: number;

  // @Property({ default: 2 })
  // maxStrikesBeforePenalty: number;

  // @Property({ default: 7 }) // in days
  // penaltyDuration: number;

  @Property({ default: 0 })
  bookingCutoffMinutes: number;

  @Property({ default: 7 }) // in days
  maxAdvanceBookingDays: number;

  @Property({ default: false })
  sameDayBookingAllowed: boolean;

  @Property({ default: 0 })
  fullOpenHours: number; // 0 means always full

  @OneToOne(() => Company, company => company.scheduleOptions)
  company: Company;
}
