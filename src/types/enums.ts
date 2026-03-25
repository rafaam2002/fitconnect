export enum Durations {
  ONE_HOUR = '1 hora',
  ONE_DAY = '1 dia',
  ONE_WEEK = '1 semana',
  ONE_MONTH = '1 mes',
}

export enum UserProviderType {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  LOCAL = 'local',
}

export enum NotificationType {
  MESSAGE = 'message',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
}

export enum PaymentType {
  MENSUAL = 'mensual',
  ANUAL = 'anual',
}

export enum ScheduleState {
  AVAILABLE = 'available',
  CANCELLED = 'cancelled',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

export enum CreditCardType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum CreditCardProvider {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  STRIPE = 'stripe',
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
}

export enum Currency {
  EUR = 'eur',
  USD = 'usd',
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REFUND = 'REFUND',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export enum ScheduleType {
  STANDARD = 'standard',
  SPARRING = 'sparring',
  FREE = 'free',
  CONDITIONING = 'conditioning',
  COMPETITION = 'competition',
}

export enum UserRoleEnum {
  STANDARD = 'standard',
  ADMIN = 'admin',
  COACH = 'coach',
  SUPER_ADMIN = 'super_admin',
}
