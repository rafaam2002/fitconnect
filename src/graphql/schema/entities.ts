export const graphqlEntities = `
scalar JSON
scalar DateTime

type PictureUrl {
    id: ID!
    name: String!
    url: String!
}

type UserWeight {
    id: ID!
    weight: Float!
    date: String!
    user: UserResumeResponse!
}

type TrainingTask {  
    id: ID!
    content: String!
    user: User
    date: String
    repeat: Boolean!
}

type Article {
    id: ID!
    publishedAt: String!
    title: String!
    description: String!
    link: String!
    image: String!
}

type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    pictures: [PictureUrl]
}

type Company {
    id: ID!
    name: String!
    code: String
    phoneNumber: String!
    email: String!
    address: String!
    logo: PictureUrl
    pictures: [PictureUrl]
    scheduleOptions: ScheduleOptions
    companyConfig: CompanyConfig
    amIPending: Boolean
}

type User {
    id: ID!
    name: String
    surname: String
    email: String!
    pictureUrl: PictureUrl
    nickname: String!
    isActive: Boolean
    isBlocked: Boolean
    schedules: [Schedule]
    userWeights: [UserWeight]
    phoneNumber: String
    isVerified: Boolean
    companies: [Company]
    contextRole: UserRoleEnum
    isSuperAdmin: Boolean
    activeCompanyId: ID
    isPending: Boolean
    subscription: JSON
    permissions: [String]
}

type Schedule {
    id: ID!
    description: String
    title: String!
    age: Int
    users: [User]
    waitListUsers: [User]
    created_at: String!
    updated_at: String!
    startDate: DateTime!
    endDate: DateTime!
    maxUsers: Int!
    admin: User!
    state: ScheduleState!
    type: ScheduleType!
}

type ScheduleResume {
    id: ID!
    startDate: DateTime!
    maxUsers: Int!
    state: ScheduleState!
    ocupancy: Int!
}

type ScheduleProgrammed {
    id: ID!
    title: String!
    created_at: String!
    updated_at: String!
    daysOfWeek: [Int]
    startHour: String!
    endHour: String!
    maxUsers: Int!
    admin: User!
    description: String
    age: Int
    type: ScheduleType
}
    
type ScheduleOptions {
    id: ID!
    maxActiveReservations: Int!
    maxAdvanceBookingDays: Int!
    sameDayBookingAllowed: Boolean!
    fullOpenHours: Int!
    bookingCutoffMinutes: Int!
    minBookingsRequired: Int!
}

type CompanyConfig {
    pollsEnabled: Boolean!
    productsEnabled: Boolean!
    chatEnabled: Boolean!
    trainingEnabled: Boolean!
}

type Poll {
    id: ID!
    created_at: String!
    updated_at: String!
    endDate: String!
    title: String!
    options: [String]!
    admin: User!
    pollVotes: [PollVote]
}

type PollVote { 
    poll: IdResponse!
    user: User!
    optionSelected: String!
}

type Message {
    id: ID!
    created_at: String!
    text: String!
    isFixed: Boolean
    fixedEndDate: String
    fixedAdmin: UserResumeResponse
    sender: UserResumeResponse!
    receiver: UserResumeResponse
    isForumMessage: Boolean!
}

type Conversation {
    otherUserId: ID
    messages: [Message]
}

# ── BILLING ──────────────────────────────────────────────────────────

"""
Perfil de facturación de un usuario.
Reemplaza a StripeCustomer — no existe ningún ID externo.
"""
type Customer {
    id: ID!
    created_at: String!
    updated_at: String!
    user: User
    isActive: Boolean!
    defaultCurrency: Currency!
    paymentMethods: [PaymentMethod]
}

"""
Método de pago almacenado (card-on-file).
El token de la tarjeta lo gestiona el procesador externo (Braintree).
Nunca se exponen datos sensibles de la tarjeta.
"""
type PaymentMethod {
    id: ID!
    created_at: String!
    customer: Customer!
    type: PaymentMethodType!
    status: PaymentMethodStatus!
    brand: String
    last4: String
    expiryMonth: Int
    expiryYear: Int
    country: String
    isDefault: Boolean!
    displayName: String
    isExpired: Boolean
    metadata: JSON
}

"""
Plan de suscripción. Gestionado 100% de forma interna — sin IDs de Stripe.
"""
type Plan {
    id: ID!
    created_at: String!
    updated_at: String!
    name: String!
    description: String
    amount: Float!
    currency: Currency!
    interval: PlanInterval!
    intervalCount: Int!
    trialPeriodDays: Int
    status: PlanStatus!
    isActive: Boolean!
    features: [String]
    subscriptions: [Subscription]
    metadata: JSON
}

"""
Suscripción de un usuario a un plan.
nextBillingDate y failedPaymentAttempts controlan el ciclo de cobro propio.
"""
type Subscription {
    id: ID!
    created_at: String!
    updated_at: String!
    user: IdResponse!
    customer: Customer!
    plan: Plan!
    defaultPaymentMethod: PaymentMethod
    status: SubscriptionStatus!
    currentPeriodStart: String
    currentPeriodEnd: String
    trialStart: String
    trialEnd: String
    canceledAt: String
    cancelAtPeriodEnd: Boolean
    endedAt: String
    quantity: Int
    nextBillingDate: String
    failedPaymentAttempts: Int!
    isActive: Boolean
    isInTrial: Boolean
    isPastDue: Boolean
    daysUntilRenewal: Int
    metadata: JSON
    transactions: [Transaction]
}

"""
Factura generada por el sistema de billing interno.
El número de factura (INV-YYYY-NNNNN) lo genera el propio sistema.
"""
type Invoice {
    id: ID!
    created_at: String!
    updated_at: String!
    invoiceNumber: String
    user: User!
    subscription: Subscription
    status: InvoiceStatus!
    subtotal: Float!
    tax: Float!
    total: Float!
    amountPaid: Float!
    amountRemaining: Float!
    currency: Currency!
    dueDate: String
    paidAt: String
    periodStart: String
    periodEnd: String
    description: String
    lineItems: JSON
    isPaid: Boolean!
    isOverdue: Boolean!
    formattedTotal: String!
}

"""
Registro de cada movimiento de dinero.
externalTransactionId referencia la operación en Braintree (o cualquier otro procesador).
"""
type Transaction {
    id: ID!
    created_at: String!
    externalTransactionId: String
    user: User
    paymentMethod: PaymentMethod
    subscription: Subscription
    invoice: Invoice
    type: TransactionType!
    status: TransactionStatus!
    amount: Float!
    amountRefunded: Float!
    currency: Currency!
    description: String
    failureReason: String
    metadata: JSON
}



type Notification {
    id: ID!
    created_at: String!
    updated_at: String!
    type: NotificationType!
    message: String! 
    link: String!
    user: IdResponse!
}

type Stats {
    total: Int
    active: Int
    expired: Int
    hasDefault: Boolean
    byBrand: JSON
}

type Tokens {
    token: String
    refreshToken: String
}

type UserStats {
    totalUsers: Int!
    notActiveUsers: Int!
    blockedUsers: Int!
    newUsers: Int!
    pendingUsers: Int!
}

type AdminStats {
    users: UserStats!
    schedules: Int!
    polls: Int!
    plans: Int!
    subscriptions: Int!
    transactions: Int!
    notifications: Int!
}

type GroupUser {
    standard: [User]
    specialRoles: [User]
}

type ExpoPushToken {
    id: ID!
    token: String!
}
`;
