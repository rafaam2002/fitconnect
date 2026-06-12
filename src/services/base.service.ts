import crypto from 'node:crypto';

import { EntityManager } from '@mikro-orm/core';

import { PaymentProcessor } from './payment-processor.interface';

export abstract class BaseService {
  protected readonly em: EntityManager;
  protected readonly paymentProcessor?: PaymentProcessor;

  constructor(em: EntityManager, paymentProcessor?: PaymentProcessor) {
    this.em = em;
    this.paymentProcessor = paymentProcessor;
  }

  /**
   * Genera una clave de idempotencia determinista para evitar operaciones duplicadas.
   * Útil tanto para la BD (locks optimistas) como para pasarelas externas.
   */
  protected generateIdempotencyKey(...parts: string[]): string {
    return crypto
      .createHash('sha256')
      .update(parts.join(':'))
      .digest('hex')
      .slice(0, 64);
  }

  /**
   * Añade días a una fecha.
   */
  protected addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Añade meses a una fecha respetando el último día del mes.
   */
  protected addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Añade años a una fecha.
   */
  protected addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Manejo genérico de errores de la capa de infraestructura.
   * Loguea y relanza para que el servicio concreto decida qué hacer.
   */
  protected handleProcessorError(error: any): never {
    console.error('[PaymentProcessor error]', error?.message ?? error);
    throw error;
  }
}
