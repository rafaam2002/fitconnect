import {Collection, Entity, ManyToMany, OneToMany, Property, t} from "@mikro-orm/core";
import {UserRol} from "../types/enums";
import crypto from 'crypto'
import {BaseEntity} from "./BaseEntity";
import {Schedule} from "./Schedule";
import {Message} from "./Message";
import {Notification} from "./Notification";

@Entity()
export class User extends BaseEntity {

    @Property({type: t.string})
    name!: string;

    @Property({type: t.string})
    surname!: string;

    @Property({type: t.string, lazy: true}) // means that the property will be loaded only when accessed
    password!: string;

    @Property({type: t.string, unique: true})
    email!: string;

    @Property({type: "blob", nullable: true})
    profilePicture?: Buffer;

    @Property({type: t.string, unique: true})
    nickname!: string;

    @Property({type: t.boolean})
    isActive!: boolean;

    @Property({type: t.boolean})
    isBlocked!: boolean;

    @Property({type: t.string})
    rol!: UserRol;

    @ManyToMany()
    schedules = new Collection<Schedule>(this);

    @OneToMany({mappedBy: 'admin', lazy: true})
    adminSchedules = new Collection<Schedule>(this);

    @OneToMany({mappedBy: 'sender'})
    messagesSent = new Collection<Message>(this);

    @OneToMany({mappedBy: 'receiver'})
    messagesReceived = new Collection<Message>(this);

    @OneToMany({mappedBy: 'user'})
    notifications = new Collection<Notification>(this);

    constructor(user: User) {
        super();

        this.name = user.name;
        this.surname = user.surname;
        this.password = User.hashPassword(user.password);
        this.email = user.email;
        this.nickname = user.nickname;
        this.rol = user.rol;
        this.isActive = false;
        this.isBlocked = false;
    }

    static hashPassword = (password: string) => {
        return crypto.createHmac('sha256', password).digest('hex');
    }
}
