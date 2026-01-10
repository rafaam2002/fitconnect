import { GraphQLError } from "graphql";
import { ServiceResponse } from "../types/common.type";

/**
 * Creates a standardized service response
 */
export const createServiceResponse = <T = any>(
    code: number,
    message: string,
    success: boolean = true,
    data?: T
): ServiceResponse<T> => {
    return {
        code,
        message,
        success,
        ...(data && { ...data }),
    };
};

/**
 * Custom application errors - Base class that extends GraphQLError
 */
export class AppError extends GraphQLError {
    public statusCode: number;
    public isOperational: boolean;

    constructor(
        message: string,
        statusCode: number,
        code: string = "BAD_REQUEST",
        isOperational: boolean = true
    ) {
        super(message, {
            extensions: {
                code,
                http: { status: statusCode },
            },
        });

        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * 401 - Unauthorized Error (usuario no autenticado)
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = "Please login, token expired") {
        super(message, 401, "UNAUTHENTICATED");
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * 403 - Forbidden Error (usuario autenticado pero sin permisos)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = "You are not authorized to perform this action") {
        super(message, 403, "FORBIDDEN");
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * 404 - Not Found Error (recurso no encontrado)
 */
export class NotFoundError extends AppError {
    constructor(resource: string = "Resource") {
        super(`${resource} not found`, 404, "NOT_FOUND");
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * 400 - Bad Request Error (petición inválida)
 */
export class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400, "BAD_REQUEST");
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

/**
 * 400 - Validation Error (error de validación)
 */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(`Validation Error: ${message}`, 400, "BAD_USER_INPUT");
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * 409 - Conflict Error (conflicto de recursos, ej: email duplicado)
 */
export class ConflictError extends AppError {
    constructor(message: string = "Resource already exists") {
        super(message, 409, "CONFLICT");
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * 500 - Internal Server Error (error interno del servidor)
 */
export class InternalServerError extends AppError {
    constructor(message: string = "Internal server error") {
        super(message, 500, "INTERNAL_SERVER_ERROR", false);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}

/**
 * 502 - Bad Gateway Error (error en API externa)
 * Usado cuando la API externa retorna un error o respuesta inválida
 */
export class ExternalAPIError extends AppError {
    constructor(message: string = "External service returned an error", apiName?: string) {
        const errorMessage = apiName
            ? `${apiName} API error: ${message}`
            : `External API error: ${message}`;
        super(errorMessage, 502, "BAD_GATEWAY", false);
        Object.setPrototypeOf(this, ExternalAPIError.prototype);
    }
}

/**
 * 503 - Service Unavailable Error (servicio externo no disponible)
 * Usado cuando no se puede conectar a la API externa
 */
export class ServiceUnavailableError extends AppError {
    constructor(message: string = "External service is currently unavailable", serviceName?: string) {
        const errorMessage = serviceName
            ? `${serviceName} is currently unavailable: ${message}`
            : message;
        super(errorMessage, 503, "SERVICE_UNAVAILABLE", false);
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}

/**
 * 504 - Gateway Timeout Error (timeout en API externa)
 * Usado cuando la API externa no responde en el tiempo esperado
 */
export class GatewayTimeoutError extends AppError {
    constructor(message: string = "External service timeout", timeoutMs?: number) {
        const errorMessage = timeoutMs
            ? `External service timeout after ${timeoutMs}ms: ${message}`
            : message;
        super(errorMessage, 504, "GATEWAY_TIMEOUT", false);
        Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
    }
}

/**
 * Error handler wrapper for resolvers
 * Convierte errores desconocidos a ServiceResponse
 */
export const handleError = (error: any): ServiceResponse => {
    // Si es un AppError (ya es GraphQLError), simplemente propaga
    if (error instanceof AppError) {
        throw error; // Dejar que GraphQL lo maneje
    }

    // Si es otro tipo de GraphQLError, propagar también
    if (error instanceof GraphQLError) {
        throw error;
    }

    // Error desconocido - logear y convertir a InternalServerError
    console.error("Unexpected error:", error);
    throw new InternalServerError();
};

/**
 * Wrapper para convertir ServiceResponse con error a GraphQLError
 * Útil para mantener compatibilidad con código legacy que usa ServiceResponse
 */
export const serviceResponseToError = (response: ServiceResponse): never => {
    const { code, message } = response;

    switch (code) {
        case 401:
            throw new UnauthorizedError(message);
        case 403:
            throw new ForbiddenError(message);
        case 404:
            throw new NotFoundError(message);
        case 409:
            throw new ConflictError(message);
        case 400:
            throw new BadRequestError(message);
        case 502:
            throw new ExternalAPIError(message);
        case 503:
            throw new ServiceUnavailableError(message);
        case 504:
            throw new GatewayTimeoutError(message);
        case 500:
        default:
            throw new InternalServerError(message);
    }
};

/**
 * Helper para manejar errores de fetch/axios en APIs externas
 * Convierte errores HTTP a los errores GraphQL apropiados
 */
export const handleExternalAPIError = (error: any, apiName?: string): never => {
    // Error de red (ECONNREFUSED, ENOTFOUND, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError(
            error.message || "Cannot connect to external service",
            apiName
        );
    }

    // Timeout
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutError(
            error.message || "Request timeout",
            error.timeout
        );
    }

    // Si tiene response (axios/fetch error)
    if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message || "Unknown error";

        // 4xx - Error del cliente (nuestra request está mal)
        if (status >= 400 && status < 500) {
            throw new ExternalAPIError(`Client error (${status}): ${message}`, apiName);
        }

        // 5xx - Error del servidor externo
        if (status >= 500) {
            throw new ServiceUnavailableError(`Server error (${status}): ${message}`, apiName);
        }
    }

    // Error desconocido
    throw new ExternalAPIError(
        error.message || "Unknown external API error",
        apiName
    );
};