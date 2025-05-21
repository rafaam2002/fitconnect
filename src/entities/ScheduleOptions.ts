import { Entity, Property } from "@mikro-orm/core";

import { BaseEntity } from "./BaseEntity";

@Entity()
export class ScheduleOptions extends BaseEntity {
  @Property({ default: 1 })
  maxActiveReservations: number;

  @Property({ default: 30 }) // in minutes
  cancellationDeadline: number;

  @Property({ default: 2 })
  maxStrikesBeforePenalty: number;

  @Property({ default: 7 }) // in days
  penaltyDuration: number;

  @Property({ default: 7 }) // in days
  maxAdvanceBookingDays: number;

  @Property({default: false})
  sameDayBookingAllowed: boolean;
}
