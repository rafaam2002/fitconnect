import { Entity, PrimaryKey, Property, UuidType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";
import { NotificationType, UserRol } from "../types/enums";

@Entity()
export class Schedules_option {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({ default: 3 })
  maxActiveReservations!: number;

  @Property({ default: 30 }) // in minutes
  cancellationDeadline!: number;

  @Property({ default: 2 })
  maxStrikesBeforePenalty!: number;

  @Property({ default: 7 }) // in days
  penaltyDuration!: number;

  @Property({ default: 7 }) // in days
  maxAdvanceBookingDays!: number;
}
