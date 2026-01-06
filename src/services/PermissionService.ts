import {EntityManager} from "@mikro-orm/core";
import {Permission, PermissionAction, PermissionModule,} from "../entities/Permission";
import {PlanPermission} from "../entities/PlanPermission";
import {Plan} from "../entities/Plan";
import {Subscription, SubscriptionStatus} from "../entities/Subscription";
import {BaseService} from "./BaseService";
import {CompanyPermissionsContext, LoginPermissionsContext} from "../types/permissions";

interface CreatePermissionInput {
    module: PermissionModule;
    action: PermissionAction;
    description?: string;
}

export class PermissionService extends BaseService {
    constructor(em: EntityManager) {
        super(em);
    }

    /**
     * Crear o actualizar un permiso
     */
    async createPermission(input: CreatePermissionInput): Promise<Permission> {
        const name = Permission.generateName(input.module, input.action);

        let permission = await this.em.findOne(Permission, {name});

        if (permission) {
            permission.description = input.description || permission.description;
            permission.isActive = true;
        } else {
            permission = this.em.create<Permission>(Permission, {
                name,
                module: input.module,
                action: input.action,
                description: input.description,
            });
            this.em.persist(permission);
        }

        await this.em.flush();
        return permission;
    }

    /**
     * Asignar permisos a un plan
     */
    async assignPermissionsToPlan(
        planId: string,
        permissionNames: string[]
    ): Promise<void> {
        const plan = await this.em.findOne(Plan, {id: planId}, {
                populate: ["planPermissions", "planPermissions.permission"],
            }
        );

        if (!plan) {
            throw new Error("Plan not found");
        }

        // Obtener permisos por nombre
        const permissions  = await this.em.find(Permission, {
            name: {$in: permissionNames},
            isActive: true,
        });

        if (permissions.length !== permissionNames.length) {
            const foundNames = permissions.map((p) => p.name);
            const missing = permissionNames.filter(
                (name) => !foundNames.includes(name)
            );
            console.warn(`Some permissions not found: ${missing.join(", ")}`);
        }

        // Desactivar permisos actuales que no están en la nueva lista
        const currentPlanPermissions = plan.planPermissions.getItems();
        for (const pp of currentPlanPermissions) {
            if (!permissionNames.includes(pp.permission.name)) {
                pp.isActive = false;
            }
        }

        // Agregar o reactivar permisos
        for (const permission of permissions) {
            // CORRECCIÓN: El tipo debe ser PlanPermission, no Plan
            const existing: PlanPermission | undefined = currentPlanPermissions.find(
                (pp: PlanPermission) => pp.permission.id === permission.id
            );

            if (existing) {
                existing.isActive = true;
            } else {
                const planPermission = this.em.create<PlanPermission>(PlanPermission, {
                    plan,
                    permission,
                    isActive: true,
                });
                this.em.persist(planPermission);
            }
        }

        await this.em.flush();
    }

    /**
     * Sincronizar permisos desde metadata de Stripe
     * Espera metadata con formato: { permissions: "users:create,users:read,schedules:manage" }
     */
    async syncPermissionsFromMetadata(
        planId: string,
        metadata: Record<string, any>
    ): Promise<void> {
        if (!metadata?.permissions) {
            console.log(`No permissions found in metadata for plan ${planId}`);
            return;
        }

        const permissionNames = metadata.permissions
            .split(",")
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0);

        if (permissionNames.length === 0) {
            console.log(`Empty permissions list for plan ${planId}`);
            return;
        }

        await this.assignPermissionsToPlan(planId, permissionNames);
        console.log(
            `Synced ${permissionNames.length} permissions for plan ${planId}`
        );
    }

    // ============= MÉTODOS NUEVOS: GESTIÓN POR EMPRESA =============

    /**
     * Obtener el plan activo de un usuario en una empresa específica
     */
    async getUserActivePlanInCompany(
        userId: string,
        companyId: string
    ): Promise<Plan | null> {
        const subscription = await this.em.findOne(
            Subscription,
            {
                user: userId,
                company: companyId,
                status: {
                    $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
                },
            },
            {
                populate: ["plan"] as any,
            }
        );

        return subscription?.plan || null;
    }

    /**
     * Obtener la suscripción activa de un usuario en una empresa
     */
    async getUserActiveSubscriptionInCompany(
        userId: string,
        companyId: string
    ): Promise<Subscription | null> {
        return await this.em.findOne(
            Subscription,
            {
                user: userId,
                company: companyId,
                status: {
                    $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
                },
            },
            {
                populate: [
                    "plan",
                    "plan.planPermissions",
                    "plan.planPermissions.permission",
                ],
                filters: false
            }
        );
    }

    /**
     * Verificar si un usuario tiene un permiso específico en una empresa
     * VERSIÓN MEJORADA: companyId es requerido
     */
    async userHasPermissionInCompany(
        userId: string,
        permissionName: string,
        companyId: string
    ): Promise<boolean> {
        const subscription = await this.getUserActiveSubscriptionInCompany(
            userId,
            companyId
        );

        if (!subscription) {
            return false;
        }

        const plan = subscription.plan;
        await plan.planPermissions.init();

        return plan.planPermissions
            .getItems()
            .some(
                (pp) =>
                    pp.isActive &&
                    pp.permission.isActive &&
                    pp.permission.name === permissionName
            );
    }

    /**
     * Obtener todos los permisos de un usuario en una empresa específica
     */
    async getUserPermissionsInCompany(
        userId: string,
        companyId: string
    ): Promise<Permission[]> {
        const subscription = await this.getUserActiveSubscriptionInCompany(
            userId,
            companyId
        );

        if (!subscription) {
            return [];
        }

        const plan = subscription.plan;
        await plan.planPermissions.init();

        return plan.planPermissions
            .getItems()
            .filter((pp) => pp.isActive && pp.permission.isActive)
            .map((pp) => pp.permission);
    }

    /**
     * Obtener todas las suscripciones activas de un usuario (todas las empresas)
     */
    async getUserActiveSubscriptions(userId: string): Promise<Subscription[]> {
        return await this.em.find(
            Subscription,
            {
                user: userId,
                status: {
                    $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
                },
            },
            {
                populate: [
                    "plan",
                    "company",
                    "plan.planPermissions",
                    "plan.planPermissions.permission",
                ],
            }
        );
    }

    /**
     * Verificar múltiples permisos a la vez en una empresa
     */
    async userHasAllPermissions(
        userId: string,
        permissionNames: string[],
        companyId: string
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissionsInCompany(
            userId,
            companyId
        );
        const userPermissionNames = userPermissions.map((p) => p.name);

        return permissionNames.every((name) => userPermissionNames.includes(name));
    }

    /**
     * Verificar si el usuario tiene al menos uno de los permisos especificados
     */
    async userHasAnyPermission(
        userId: string,
        permissionNames: string[],
        companyId: string
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissionsInCompany(
            userId,
            companyId
        );
        const userPermissionNames = userPermissions.map((p) => p.name);

        return permissionNames.some((name) => userPermissionNames.includes(name));
    }

    // ============= MÉTODOS ORIGINALES (RETROCOMPATIBILIDAD) =============

    /**
     * Verificar si un usuario tiene un permiso específico
     * @deprecated Usar userHasPermissionInCompany para mayor claridad
     */
    async userHasPermission(
        userId: string,
        permissionName: string,
        companyId?: string
    ): Promise<boolean> {
        if (!companyId) {
            console.warn(
                "userHasPermission called without companyId. Consider using userHasPermissionInCompany."
            );
            return false;
        }

        return this.userHasPermissionInCompany(userId, permissionName, companyId);
    }


    // ============= MÉTODOS DE ADMINISTRACIÓN =============

    /**
     * Listar todos los permisos disponibles en el sistema
     */
    async listAllPermissions(): Promise<Permission[]> {
        return await this.em.find(Permission, {isActive: true});
    }

    /**
     * Obtener permisos agrupados por módulo
     */
    async getPermissionsByModule(): Promise<Map<PermissionModule, Permission[]>> {
        const permissions = await this.listAllPermissions();
        const grouped = new Map<PermissionModule, Permission[]>();

        for (const permission of permissions) {
            if (!grouped.has(permission.module)) {
                grouped.set(permission.module, []);
            }
            grouped.get(permission.module)!.push(permission);
        }

        return grouped;
    }

    /**
     * Obtener todos los permisos de un plan específico
     */
    async getPlanPermissions(planId: string): Promise<Permission[]> {
        const plan = await this.em.findOne(
            Plan,
            {id: planId},
            {
                populate: ["planPermissions", "planPermissions.permission"],
            }
        );

        if (!plan) {
            throw new Error("Plan not found");
        }

        return plan.planPermissions
            .getItems()
            .filter((pp: PlanPermission) => pp.isActive && pp.permission.isActive)
            .map((pp: PlanPermission) => pp.permission);
    }

    /**
     * Verificar si un plan tiene un permiso específico
     */
    async planHasPermission(
        planId: string,
        permissionName: string
    ): Promise<boolean> {
        const permissions = await this.getPlanPermissions(planId);
        return permissions.some((p) => p.name === permissionName);
    }

    /**
     * Inicializar permisos básicos del sistema
     */
    async seedPermissions(): Promise<void> {
        const modules = Object.values(PermissionModule) as PermissionModule[];
        const actions = Object.values(PermissionAction) as PermissionAction[];

        for (const module of modules) {
            for (const action of actions) {
                await this.createPermission({
                    module,
                    action,
                    description: `${action} permission for ${module} module`,
                });
            }
        }

        console.log("Permissions seeded successfully");
    }

    /**
     * Desactivar un permiso (soft delete)
     */
    async deactivatePermission(permissionId: string): Promise<void> {
        const permission = await this.em.findOne(Permission, {id: permissionId});

        if (!permission) {
            throw new Error("Permission not found");
        }

        permission.isActive = false;
        await this.em.flush();

        console.log(`Permission ${permission.name} deactivated`);
    }

    /**
     * Reactivar un permiso
     */
    async activatePermission(permissionId: string): Promise<void> {
        const permission = await this.em.findOne(Permission, {id: permissionId});

        if (!permission) {
            throw new Error("Permission not found");
        }

        permission.isActive = true;
        await this.em.flush();

        console.log(`Permission ${permission.name} activated`);
    }

    /**
     * Obtener información completa de permisos para el login
     * Este es el método principal que usarás en la autenticación
     */
    async getLoginPermissionsContext(
        userId: string,
        companyId: string
    ): Promise<LoginPermissionsContext> {
        const subscription = await this.getUserActiveSubscriptionInCompany(userId, companyId);

        if (!subscription) {
            return {
                hasActiveSubscription: false,
                plan: null,
                permissions: [],
                permissionNames: [],
                subscriptionStatus: null,
                trialEndsAt: null,
                renewsAt: null
            };
        }

        const plan = subscription.plan;
        // await plan.planPermissions.init();

        const permissions = plan.planPermissions
            .getItems()
            .filter(pp => pp.isActive && pp.permission.isActive)
            .map(pp => pp.permission);

        const permissionNames = permissions.map(p => p.name);

        return {
            hasActiveSubscription: true,
            plan: {
                id: plan.id,
                name: plan.name,
                stripePriceId: plan.stripePriceId,
                amount: plan.amount,
                currency: plan.currency,
                interval: plan.interval
            },
            permissions,
            permissionNames,
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            trialEndsAt: subscription.trialEnd,
            renewsAt: subscription.currentPeriodEnd,
            isInTrial: subscription.isInTrial
        };
    }

    /**
     * Versión simplificada que solo devuelve los nombres de permisos
     * Útil para incluir en el JWT token
     */
    async getLoginPermissionNames(
        userId: string,
        companyId: string
    ): Promise<string[]> {
        const context = await this.getLoginPermissionsContext(userId, companyId);
        return context.permissionNames;
    }

    /**
     * Obtener todas las empresas con sus permisos para un usuario
     * Útil cuando el usuario puede cambiar de empresa en la UI
     */
    async getUserCompaniesWithPermissions(
        userId: string
    ): Promise<CompanyPermissionsContext[]> {
        const subscriptions = await this.getUserActiveSubscriptions(userId);

        const companiesContext: CompanyPermissionsContext[] = [];

        for (const subscription of subscriptions) {
            const plan = subscription.plan;
            await plan.planPermissions.init();

            const permissions = plan.planPermissions
                .getItems()
                .filter(pp => pp.isActive && pp.permission.isActive)
                .map(pp => pp.permission);

            companiesContext.push({
                companyId: subscription.company.id,
                companyName: subscription.company.name,
                plan: {
                    id: plan.id,
                    name: plan.name,
                    amount: plan.amount,
                    currency: plan.currency
                },
                permissions: permissions.map(p => p.name),
                subscriptionStatus: subscription.status,
                isInTrial: subscription.isInTrial,
                trialEndsAt: subscription.trialEnd,
                renewsAt: subscription.currentPeriodEnd
            });
        }

        return companiesContext;
    }
}
