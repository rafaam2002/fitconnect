export const graphqlEnums = `
enum NotificationType{
    message
    warning
    error
    info
}

enum UserRol {
    standard
    boss
    premium
    coach
}

enum PaymentMethod {
    credit_card
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
`;
