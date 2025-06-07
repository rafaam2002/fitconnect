export enum Durations {
  ONE_HOUR = "1 hora",
  ONE_DAY = "1 dia",
  ONE_WEEK = "1 semana",
  ONE_MONTH = "1 mes",
}

export enum UserRol {
  STANDARD = "standard",
  BOSS = "boss",
  PREMIUM = "premium",
  COACH = "coach",
}

export enum NotificationType {
  MESSAGE = "message",
  WARNING = "warning",
  ERROR = "error",
  INFO = "info",
}

export enum PaymentType {
  MENSUAL = "mensual",
  ANUAL = "anual",
}

export enum ScheduleState {
  AVAILABLE = "available",
  CANCELLED = "cancelled",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  PENDING = "pending",
}

export enum CreditCardType {
  CREDIT = "credit",
  DEBIT = "debit",
}

export enum CreditCardProvider {
  VISA = "visa",
  MASTERCARD = "mastercard",
  STRIPE = "stripe",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  APPLE_PAY = "apple_pay",
  GOOGLE_PAY = "google_pay",
}

export enum Currency {
  EUR = "eur",
  USD = "usd",
}

export enum TransactionStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING",
  REFUND = "REFUND",
}

export enum ScheduleType {
  STANDARD = "standard",
  SPARRING = "sparring",
  FREE = "free",
}
