import { Entity, PrimaryKey, Property, UuidType, t } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";
import { UserRol } from "../types/enums";

@Entity()
export class User {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({type: t.string })
  name!: string;

  @Property({type: t.string})
  surname!: string;

  @Property({type: t.string})
  password!: string;

  @Property({type: t.string})
  email!: string;

  @Property({ type: "blob", nullable: true })
  profilePicture?: Buffer;

  @Property({type: t.string})
  nickname!: string;

  @Property({type: t.boolean})
  isActived!: boolean;

  @Property({type: t.boolean})
  isBlocked!: boolean;

  @Property({type: t.string})
  rol!: UserRol;


}
