import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Permission } from './Permission';
import { Plan } from './Plan';

@Entity()
@Index()
@Unique({ properties: ['plan', 'permission'] })
export class PlanPermission extends BaseEntity {
  @ManyToOne(() => Plan, { eager: false })
  @Index()
  plan!: Plan;

  @ManyToOne(() => Permission, { eager: true })
  @Index()
  permission!: Permission;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // metadata adicional específico para este permiso en este plan

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  constructor(plan: Plan, permission: Permission) {
    super();
    this.plan = plan;
    this.permission = permission;
  }
}
