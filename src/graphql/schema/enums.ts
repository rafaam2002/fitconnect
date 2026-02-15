export const graphqlEnums = `
enum NotificationType{
    message
    warning
    error
    info
}

enum UserRoleEnum {
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
    incomplete
    incomplete_expired
    trialing
    active
    past_due
    canceled
    unpaid
    paused
}

enum CreditCardType {
    credit
    debit
}

enum CreditCardProvider{
    visa
    mastercard
}

enum PaymentMethodEnum {
    credit_card
    apple_pay
    google_pay
}

enum Currency {
    eur
    usd
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

enum TransactionStatus {
    pending
    succeeded
    failed
    canceled
    refunded
    partially_refunded
}

enum TransactionType {
    charge
    refund
    payment
    subscription
}
`;
