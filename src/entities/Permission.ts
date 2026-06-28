import {
  Collection,
  Entity,
  Enum,
  Index,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { PlanPermission } from './PlanPermission';

export enum PermissionModule {
  USERS = 'users',
  SCHEDULES = 'schedules',
  PAYMENTS = 'payments',
  SETTINGS = 'settings',
  PROMOTIONS = 'promotions',
  CHATS = 'chats',
  POLLS = 'polls',
  WORKOUTS = 'workouts',
  PLANS = 'plans',
  PRODUCTS = 'products',
  USER_WEIGHTS = 'user_weights',
  STATS = 'stats',
  COMPANIES = 'companies',
  SUBSCRIPTIONS = 'subscriptions',
  // Añadir aquí el valor que falta, por ejemplo:
  TRANSACTIONS = 'transactions',
  INVOICES = 'invoices',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // todos los permisos
}

@Entity()
export class Permission extends BaseEntity {
  @Property({ length: 100 })
  @Index()
  @Unique()
  name!: string;

  @Property({ length: 255, nullable: true })
  description?: string;

  @Enum(() => PermissionModule)
  @Index()
  module!: PermissionModule;

  @Enum(() => PermissionAction)
  action!: PermissionAction;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @OneToMany(() => PlanPermission, pp => pp.permission)
  planPermissions = new Collection<PlanPermission>(this);

  constructor(data: {
    name: string;
    description?: string;
    module: PermissionModule;
    action: PermissionAction;
  }) {
    super();
    this.name = data.name;
    this.description = data.description;
    this.module = data.module;
    this.action = data.action;
  }

  // Helper para generar el nombre del permiso
  static generateName(
    module: PermissionModule,
    action: PermissionAction
  ): string {
    return `${module}:${action}`;
  }
}
