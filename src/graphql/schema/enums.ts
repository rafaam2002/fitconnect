export const graphqlEnums = `
enum NotificationType{
    message
    warning
    error
    info
}

enum UserRole {
    standard
    boss
    premium
    coach
}

enum ScheduleType {
    standard
    sparring
    free
    conditioning
    competition
}

enum PaymentMethodType {
    card
    apple_pay
    google_pay
}

enum PaymentType {
    mensual
    anual
}

enum ScheduleState {
    available
    cancelled
    full
}

enum SubscriptionStatus{
    active
    cancelled
    pending
}

enum CreditCardType {
    credit
    debit
}

enum CreditCardProvider{
    visa
    mastercard
}

enum PaymentMethod {
    credit_card
    apple_pay
    google_pay
}

enum Currency {
    eur
    usd
}

enum TransactionStatus {
    SUCCESS
    FAILED
    PENDING
    REFUND
}

enum LogicalOperator {
  and
  or
}

enum PaymentMethodStatus {
  active
  inactive
  expired
}

enum PlanInterval {
   day
   week
   month
   year
}

enum PlanStatus {
    active
    inactive
    archived
}
`;
