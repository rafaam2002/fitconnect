/**
 * Common types and interfaces for the application
 */

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

export interface PushNotificationData {
  type: string;
  [key: string]: any;
}