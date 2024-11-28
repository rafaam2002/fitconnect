import { Entity, PrimaryKey, Property, UuidType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";
import { UserRol } from "../types/enums";

@Entity()
export class User {
  @PrimaryKey()
  id: string = randomUUID();

  @Property()
  name!: string;

  @Property()
  surname!: string;

  @Property()
  password!: string;

  @Property()
  email!: string;

  @Property({ type: "blob", nullable: true })
  profilePicture?: Buffer;

  @Property()
  nickname!: string;

  @Property()
  isActived!: boolean;

  @Property()
  isBlocked!: boolean;

  @Property()
  rol!: UserRol;

  
}
