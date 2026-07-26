# 0003-deferred-only-cancellation

## Contexto

Existían varias rutas que podían dejar una suscripción en estado `CANCELED`:

- `cancelSubscription` con `cancelAtPeriodEnd` falsy la cancelaba de inmediato,
  dejando el `status = CANCELED` aunque `currentPeriodEnd` siguiera en el futuro.
- `adminOverride` podía forzar `status = CANCELED` sin tocar `currentPeriodEnd`.
- `replaceSubscription` (sin front que la llamara) y `replaceCanceledSubscription`
  (la llamada "Vertiente 3" dentro de `createSubscription`) dejaban una vieja
  suscripción `CANCELED` conservando su período pagado vivo.

Como consecuencia, el invariante **"CANCELED ⇒ el período pagado ya terminó"**
solo se cumplía **por convención** (ningún front ejercitaba las rutas inmediatas),
no por construcción. Y la Vertiente 3 —diseñada para "reemplazar una cancelada con
período pendiente"— era código de facto muerto, porque en el sistema vivo una
`CANCELED` nunca tenía período pendiente.

## Decisiones

1. **La cancelación estándar es siempre diferida.** `cancelSubscription` fija
   siempre `cancelAtPeriodEnd = true`, registra historial y deja intactos `status`
   y `currentPeriodEnd`: el miembro conserva el acceso durante el período que pagó.
   El CRON de billing (`processBillingCycle`) sigue siendo la única ruta que
   realiza la transición real a `CANCELED` al vencer el período. No está restringido
   a admins: un miembro puede cancelar su propia suscripción.

2. **El campo de entrada `cancelAtPeriodEnd` queda obsoleto y se ignora** en el
   servidor (la cancelación es diferida sea cual sea su valor). Se mantiene en el
   esquema GraphQL para que el backoffice siga funcionando sin cambios.

3. **Nueva cancelación radical (inmediata), solo admin.** `radicalCancelSubscription`
   —bajo el mismo gate de permisos que el resto de operaciones admin de suscripción
   (`plansPermissions.CREATE_UPDATE_DELETE`)— exige un motivo obligatorio y trunca el
   período: `status = CANCELED`, `canceledAt = endedAt = currentPeriodEnd = ahora`,
   `nextBillingDate = undefined`, con entrada de audit log atribuida al admin. El
   miembro pierde los días restantes.

4. **`adminOverride` ya no puede transicionar a `CANCELED`** (el resto de sus
   capacidades no cambia). Consolidamos todas las rutas hacia `CANCELED` en dos:
   el CRON (diferida) y la cancelación radical (inmediata) — ambas preservan el
   invariante por construcción.

5. **Eliminación de la Vertiente 3 (código muerto):**
   `findRecentCanceledWithPendingPeriod`, `replaceCanceledSubscription` y su rama en
   `createSubscription`. Como tras esto `replaceSubscription` (+ su maquinaria
   `buildReplacementSubscription` y helpers) se quedaba sin ningún llamador (no
   estaba cableada a ningún front, solo presente en tipos generados), también se
   eliminó por completo.

## Consecuencias

- El invariante **"CANCELED ⇒ `currentPeriodEnd <= now`"** se cumple ahora **por
  construcción**: las únicas dos rutas vivas a `CANCELED` (CRON diferido y radical
  admin) lo garantizan.
- Ya no existe terminación instantánea para no-admins: un miembro que cancela
  siempre disfruta hasta el fin del período pagado.
- La cancelación radical hace que el miembro **pierda los días restantes** de su
  período pagado (truncado a la fecha de la cancelación).
- Menos superficie de código y de rutas de estado: la máquina de reemplazo y la
  Vertiente 3 desaparecen, reduciendo el riesgo de estados inconsistentes.
- Sin cambio de contrato que rompa a los fronts: la nueva mutación es aditiva y
  `cancelAtPeriodEnd` se mantiene (retenido-pero-ignorado).

## Trade-off

Se renuncia a la terminación instantánea auto-servicio (no-admin). La única vía de
corte inmediato queda reservada a administradores vía `radicalCancelSubscription`.
Se consideró aceptable: mantener el acceso por el período ya pagado es la conducta
correcta de negocio, y el escape inmediato sigue disponible para casos
excepcionales bajo control de admin.
