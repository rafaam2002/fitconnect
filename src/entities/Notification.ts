import { Entity, PrimaryKey, Property, UuidType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";
import { NotificationType, UserRol } from "../types/enums";

@Entity()
export class Notification {
  @PrimaryKey()
  id: string = randomUUID();

  @Property()
  created_at: Date = new Date();

  @Property()
  updated_at: Date = new Date();

  @Property()
  type!: NotificationType;

  @Property()
  message!: string;

  @Property()
  link!: string;
}
