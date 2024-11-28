import { Entity, PrimaryKey, Property, UuidType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";
import { NotificationType, UserRol } from "../types/enums";

@Entity()
export class Schedule {
  @PrimaryKey()
  id: string = randomUUID();

  @Property()
  created_at: Date = new Date();

  @Property()
  updated_at: Date = new Date();

  @Property()
  startTime!: Date;

  @Property()
  Duration!: number; // in minutes

  @Property()
  maxUsers!: number;

  @Property({ default: false })
  isCancelled!: boolean;

  @Property({ default: false })
  isProgammed!: boolean;
}
