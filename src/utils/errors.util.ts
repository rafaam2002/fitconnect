import { GraphQLError } from "graphql";
import {ServiceResponse} from "../types/common.type";

/**
 * Creates a standardized service response
 */
export const createServiceResponse = <T = any>(
    statusCode: number,
    message: string,
    success: boolean = true,
    data?: T
): ServiceResponse<T> => {
    return {
        statusCode,
        message,
        success,
        ...(data && { data }),
    };
};

/**
 * Custom application errors
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Please login, token expired") {
        super(401, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "You are not authorized to perform this action") {
        super(403, message);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = "Resource") {
        super(404, `${resource} not found`);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, `Validation Error: ${message}`);
    }
}

/**
 * Converts AppError to GraphQL Error
 */
export const toGraphQLError = (error: AppError): GraphQLError => {
    return new GraphQLError(error.message, {
        extensions: {
            code: error.statusCode === 401 ? "UNAUTHENTICATED" : "BAD_REQUEST",
            http: { status: error.statusCode },
        },
    });
};

/**
 * Error handler wrapper for resolvers
 */
export const handleError = (error: any): ServiceResponse => {
    if (error instanceof AppError) {
        return createServiceResponse(error.statusCode, error.message, false);
    }

    console.error("Unexpected error:", error);
    return createServiceResponse(500, "Internal server error", false);
};