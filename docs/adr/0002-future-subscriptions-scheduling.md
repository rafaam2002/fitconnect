# 0002-future-subscriptions-scheduling

## Contexto

Los administradores necesitan poder programar suscripciones (gratuitas) para fechas futuras posteriores al fin de período de la suscripción activa actual de un usuario.

## Decisiones

1. Permitir que el método `createSubscription` acepte un `startDate` posterior a la fecha de finalización (`currentPeriodEnd`) de la suscripción en curso del usuario en la misma empresa.
2. Al programar una suscripción futura, la suscripción en curso se marcará de forma automática con `cancelAtPeriodEnd = true` para evitar renovaciones conflictivas.
3. Limitar a un máximo de una suscripción futura activa por usuario/empresa simultáneamente para prevenir solapamientos y simplificar el ciclo de cobro/renovación.
4. Mantener la validación `validatePaidPlanStartDate` activa para que solo las suscripciones gratuitas (`amount === 0`) puedan programarse en el futuro.
5. Sanear todas las fechas de inicio y fin (`currentPeriodStart` y `currentPeriodEnd`) al inicio del día (`00:00:00.000`) para garantizar una transición matemáticamente exacta y sin horas muertas de acceso.

## Consecuencias

- Los administradores pueden planificar la transición de suscripciones gratuitas sin interrupciones.
- Se previene la existencia de múltiples suscripciones futuras encadenadas para el mismo usuario.
- El ciclo de cobro diario (CRON) no entra en conflicto ya que la suscripción anterior se cancela exactamente cuando inicia la futura.
- Se eliminan las horas muertas de acceso entre el vencimiento de una suscripción y el inicio de la siguiente.
