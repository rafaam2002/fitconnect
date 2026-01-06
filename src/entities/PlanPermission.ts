import {
    Entity,
    ManyToOne,
    Property,
    Index, Unique,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { Plan } from "./Plan";
import { Permission } from "./Permission";

@Entity()
@Index()
export class PlanPermission extends BaseEntity {
    @ManyToOne(() => Plan, { eager: false })
    @Index()
    plan!: Plan;

    @ManyToOne(() => Permission, { eager: true })
    @Index()
    @Unique()
    permission!: Permission;

    @Property({ type: "json", nullable: true })
    metadata?: Record<string, any>; // metadata adicional específico para este permiso en este plan

    @Property({ type: "boolean", default: true })
    isActive: boolean = true;

    constructor(plan: Plan, permission: Permission) {
        super();
        this.plan = plan;
        this.permission = permission;
    }
}