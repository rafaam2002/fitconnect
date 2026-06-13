export const graphqlInputs = `

input CreateProductInput {
    name: String!
    description: String!
    price: Float!
}

input AddUserWeightInput {
    userId: ID!
    weight: Float!
    date: String!
}

input CreateTrainingTaskInput {
    content: String!
    userId: ID
    date: String!
    repeat: Boolean!
}

input UpdateUserInput {
    id: ID!
    name: String
    surname: String
    email: String!
    phoneNumber: String
    nickname: String!
    isBlocked: Boolean
    role: UserRoleEnum
    activeCompanyId: String
}

input CreateCompanyInput {
    name: String!
    phoneNumber: String!
    email: String!
    address: String!
}

input CompanyDataInput {
    name: String
    address: String
    phoneNumber: String
    email: String
    code: String
    companyConfig: CompanyConfigInput
}

input CompanyConfigInput {
    pollsEnabled: Boolean
    productsEnabled: Boolean
    chatEnabled: Boolean
    trainingEnabled: Boolean
}

input ScheduleOptionsInput {
    maxActiveReservations: Int,
    maxAdvanceBookingDays: Int,
    sameDayBookingAllowed: Boolean,
    fullOpenHours: Int,
    bookingCutoffMinutes: Int,
    minBookingsRequired: Int,
    quotaWarningThresholds: [Int],
}

input UpdateScheduleInput {
    id: ID!
    title: String
    description: String
    age: Int
    type: ScheduleType
    startHour: String
    endHour: String
    maxUsers: Int
    admin: ID
    date: String
}

input UpdateScheduleProgrammedInput {
    id: ID!
    daysOfWeek: [Int]
    startHour: String
    endHour: String
    maxUsers: Int
    admin: ID
    title: String
    description: String
    type: ScheduleType
    age: Int
}

input CreateUserInput {
    email: String!
    nickname: String!
    password: String!
    role: UserRoleEnum!
}

input CreatePollVoteInput {
    pollId: ID!
    option: Int!
}

input UpdatePasswordInput {
    currentPassword: String!
    newPassword: String!
    confirmPassword: String!
}

input CreateScheduleInput {
    title: String!
    description: String!
    age: Int
    type: ScheduleType!
    startHour: String!
    endHour: String!
    days: [Int]!
    repeat: Boolean
    maxUsers: Int!
    admin: ID!
    date: String
}

input UpdateScheduleOptionsInput {
    maxActiveReservations: Int!,
    maxAdvanceBookingDays: Int!,
    sameDayBookingAllowed: Boolean!,
    fullOpenHours: Int!,
    bookingCutoffMinutes: Int!,
    minBookingsRequired: Int!,
    quotaWarningThresholds: [Int]!,
}

input CreateScheduleDevelopmentInput {
    title: String!
    startTime: String
    endTime: String
    maxUsers: Int!
    state: ScheduleState
}

input PollFilter {
    since: String!
}

input CreatePollInput {
    title: String!
    options: [String]!
    endDate: String!
}

input CreateMessageInput {
    text: String!
    receiverId: ID
    isFixed: Boolean
    fixedDuration: Boolean
    isForumMessage: Boolean
}

input UserInput {
    name: String!
    surname: String!
    password: String!
    email: String!
    nickname: String!
}

input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
}

input SendNotificationInput {
    title: String!
    body: String!
    forAll: Boolean!
}

input PlanFilterInput {
    id: ID!
    condition: PlanFilterConditionEnum!
}

# ── BILLING ──────────────────────────────────────────────────────────

"""
Creación de un plan. el sistema genera su propio ID.
"""
input CreatePlanInput {
    name: String!
    description: String
    amount: Float!
    currency: Currency
    interval: PlanInterval!
    intervalCount: Int
    trialPeriodDays: Int
    features: [String]
    metadata: JSON
}

"""
Actualización parcial de un plan.
Cambiar amount no afecta suscripciones activas hasta su próxima renovación.
"""
input UpdatePlanInput {
    id: ID!
    name: String
    description: String
    amount: Float
    features: [String]
    metadata: JSON
    status: PlanStatus
    isActive: Boolean
}

"""
Creación del perfil de facturación de un usuario.
Se llama automáticamente al registrar un usuario — no suele usarse desde el cliente.
"""
input CreateCustomerInput {
    userId: ID!
    currency: Currency
    metadata: JSON
}

"""
Actualización del perfil de facturación.
"""
input UpdateCustomerInput {
    customerId: ID!
    currency: Currency
    isActive: Boolean
    metadata: JSON
}

"""
Añade un método de pago ya tokenizado por el procesador externo.
El frontend obtiene el token tras completar el flujo del Drop-in UI de Braintree.
Nunca se envían datos de tarjeta en crudo al backend.
"""
input AddPaymentMethodInput {
    customerId: ID!
    """paymentMethodToken permanente devuelto por el Vault de Braintree"""
    externalToken: String!
    brand: String
    last4: String
    expiryMonth: Int
    expiryYear: Int
    fingerprint: String
    country: String
    setAsDefault: Boolean
}

input CreateSubscriptionInput {
    planId: ID!
    userId: ID!
    paymentMethodId: ID
    trialPeriodDays: Int
    quantity: Int
    metadata: JSON
}

input UpdateSubscriptionInput {
    subscriptionId: ID!
    planId: ID
    paymentMethodId: ID
    quantity: Int
    metadata: JSON
}

input CancelSubscriptionInput {
    subscriptionId: ID!
    cancelAtPeriodEnd: Boolean
    cancellationReason: String
}

"""
Cambio de plan con prorrateo opcional.
prorate=true → cobra/acredita la diferencia proporcional de inmediato.
prorate=false → aplica el nuevo plan en el siguiente período (sin cobro ahora).
"""
input ChangePlanInput {
    subscriptionId: ID!
    newPlanId: ID!
    prorate: Boolean
}

"""
Operación administrativa sobre una suscripción.
Todos los cambios quedan registrados en el audit log.
"""
input AdminOverrideSubscriptionInput {
    subscriptionId: ID!
    status: SubscriptionStatus
    currentPeriodEnd: String
    nextBillingDate: String
    resetFailedAttempts: Boolean
    """Obligatorio — queda en el audit log"""
    reason: String!
}

"""
Cargo manual sobre un usuario. El CRON usa la lógica interna directamente.
"""
input CreateChargeInput {
    userId: ID!
    amount: Int!
    currency: Currency
    paymentMethodId: ID
    invoiceId: ID
    subscriptionId: ID
    description: String
    metadata: JSON
}

input RefundTransactionInput {
    transactionId: ID!
    amount: Float
    reason: String
    metadata: JSON
}


`;
