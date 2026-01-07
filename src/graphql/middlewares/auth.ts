import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { EntityManager } from "@mikro-orm/core";
import {ForbiddenError, UnauthorizedError} from "../../utils/errors.util";
import {CurrentUser} from "../../types/common.type";
import {User} from "../../entities/User";

/**
 * Authentication Middleware
 * Validates JWT token and attaches user to context
 */
export const authMiddleware = async (
    token: string | undefined,
    em: EntityManager
): Promise<CurrentUser | null> => {
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

        const user = await em.findOne(User, { id: decoded.id }, {
            populate: ["roles"],
        });

        if (!user) {
            throw new UnauthorizedError("User not found");
        }

        return {
            id: user.id,
            email: user.email!,
            nickname: user.nickname,
            contextRole: 'user.role',
            activeCompanyId: user.activeCompanyId!,
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new GraphQLError("Token expired, please login again", {
                extensions: {
                    code: "UNAUTHENTICATED",
                    http: { status: 401 },
                },
            });
        }

        throw new GraphQLError("Invalid token", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }
};

/**
 * Require authentication decorator
 */
export const requireAuth = (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        const context = args[2]; // Context is typically the 3rd argument

        if (!context.currentUser) {
            throw new UnauthorizedError();
        }

        return originalMethod.apply(this, args);
    };

    return descriptor;
};

/**
 * Require specific roles decorator
 */
export const requireRoles = (...roles: string[]) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const context = args[2];

            if (!context.currentUser) {
                throw new UnauthorizedError();
            }

            if (!roles.includes(context.currentUser.contextRole)) {
                throw new ForbiddenError();
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
};

/**
 * Authorization helper functions
 */
export const AuthHelpers = {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: (currentUser?: CurrentUser): boolean => {
        return !!currentUser;
    },

    /**
     * Check if user has specific role
     */
    hasRole: (currentUser: CurrentUser, role: string): boolean => {
        return currentUser.contextRole === role;
    },

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole: (currentUser: CurrentUser, roles: string[]): boolean => {
        return roles.includes(currentUser.contextRole);
    },

    /**
     * Check if user is owner of resource
     */
    isOwner: (currentUser: CurrentUser, resourceOwnerId: string): boolean => {
        return currentUser.id === resourceOwnerId;
    },

    /**
     * Check if user can access resource (owner or admin)
     */
    canAccess: (
        currentUser: CurrentUser,
        resourceOwnerId: string,
        adminRole: string = "BOSS"
    ): boolean => {
        return (
            currentUser.id === resourceOwnerId ||
            currentUser.contextRole === adminRole
        );
    },
};