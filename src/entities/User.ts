import { Entity, PrimaryKey, Property, t} from "@mikro-orm/core";
import {randomUUID} from "node:crypto";
import {UserRol} from "../types/enums";
import crypto from 'crypto'
import {BaseEntity} from "./BaseEntity";

@Entity()
export class User extends BaseEntity {

  @Property({type: t.string })
  name!: string;

  @Property({type: t.string})
  surname!: string;

  @Property({type: t.string})
  password!: string;

  @Property({type: t.string, unique:true})
  email!: string;

  @Property({ type: "blob", nullable: true })
  profilePicture?: Buffer;

  @Property({type: t.string, unique: true})
  nickname!: string;

  @Property({type: t.boolean})
  isActived!: boolean;

  @Property({type: t.boolean})
  isBlocked!: boolean;

  @Property({type: t.string})
  rol!: UserRol;

  constructor(user: User){
    super();

    this.name = user.name;
    this.surname = user.surname;
    this.password = User.hashPassword(user.password);
    this.email = user.email;
    this.nickname = user.nickname;
    this.rol = user.rol ;
    this.isActived = false;
    this.isBlocked = false;
  }

  static hashPassword =(password:string) =>{
    return crypto.createHmac('sha256', password).digest('hex');
  }
}
