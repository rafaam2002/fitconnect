/**
 * Common types and interfaces for the application
 */

import { Plan } from '../entities/Plan';

import { SubscriptionStatus } from './enums';

export interface ServiceResponse<T = any> {
  code: number;
  message: string;
  success: boolean;
  data?: T;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CurrentUser {
  id: string;
  email: string;
  nickname: string;
  contextRole: string;
  name: string;
  phoneNumber: string;
  activeCompanyId?: string;
  hasActiveSubscription: boolean;
  plan: Plan | null;
  permissions: any[];
  permissionNames: string[];
  isSuperAdmin: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt?: string | Date | null;
  renewsAt?: string | Date | null;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}

export interface EmailConfig {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

export interface PushNotificationRichContent {
  /** URL de imagen a adjuntar (requiere mutableContent en iOS) */
  image?: string;
}

export interface PushNotificationData {
  type: string;
  /**
   * Identificador de categoría interactiva registrada en el cliente vía
   * Notifications.setNotificationCategoryAsync (ej. 'NUEVA_RUTINA').
   * Opcional: si no se envía, la notificación se comporta como hoy (sin botones).
   */
  categoryIdentifier?: string;
  /** Adjuntos multimedia opcionales (ej. imagen de la rutina) */
  richContent?: PushNotificationRichContent;
  [key: string]: any;
}
