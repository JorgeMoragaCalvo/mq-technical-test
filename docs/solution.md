# Solución — Conciliación de Pagos de Arriendo

## 1. Implementado vs. pendiente

### Implementado
**Backend (Django + DRF + PostgreSQL)**
- Modelos: `Collection`, `BankMovement` y `PaymentAllocation` (el modelo intermedio que lleva el monto asignado en CLP sobre la relación muchos a muchos).
- `UF_VALUE_CLP` como configuración basada en variables de entorno (por defecto `40000`).
- Lógica de saldo sensible a la moneda en `tasks/services.py`: helpers de conversión, saldo por cobro (esperado / pagado / pendiente / **crédito** / estado), todo en `Decimal`.
- `reconcile()` atómico que hace cumplir la invariante *una transferencia no puede asignar más que su monto*.
- API REST (router de DRF, reemplaza `/api/tasks/`):
  - `GET/POST /api/collections/`
  - `GET /api/collections/history/` — pendiente vs. pagado + desglose de pagos por cobro
  - `GET/POST /api/bank-movements/`
  - `POST /api/bank-movements/{id}/reconcile/` — aplica una transferencia a uno o más cobros
- $10$ pruebas pytest: conversión, parcial/exacto/sobrepago, sobreasignación → 400 (con rollback atómico), división (una transferencia → muchos cobros) y el caso inverso, API + historial.
- Los modelos están registrados en el admin de Django.

**Frontend (Next.js App Router + styled-components, TS estricto, sin `any`)**
- Cliente de API tipado (`src/lib/api.ts`) que lee `NEXT_PUBLIC_API_URL`, con un `ApiError` tipado.
- Formularios para crear `Collection` y `BankMovement`.
- Panel de conciliación: elegir una transferencia → asignar montos a los cobros pendientes → indicador de capacidad restante que bloquea la sobreasignación antes de enviar.
- Panel de historial: badges de estado pendiente/pagado, saldos en la moneda del cobro, crédito, y la lista de transferencias que pagaron cada cobro.
- Estados de carga y error en la carga inicial y en cada mutación.

### Pendiente / fuera de alcance
- Editar o revertir una asignación existente desde la UI (el backend soporta actualización vía reaplicación; no hay endpoint/UI de eliminación).
- Paginación/filtrado del historial (suficiente para los volúmenes de datos de la prueba).
- Autenticación / multi-tenancy (la prueba específica `AllowAny`).
- Manejo/visualización explícita del *remanente no asignado* de una transferencia como crédito reutilizable.

## 2. Flujo de datos de extremo a extremo

1. El usuario envía un formulario en `/tasks`. La página llama a una función tipada en `src/lib/api.ts`, que hace `fetch` a `${NEXT_PUBLIC_API_URL}/api/...`.
2. DRF enruta la petición a un ViewSet. Las escrituras pasan por serializers (validación) y, para la conciliación, por `services.reconcile()` dentro de un bloque `transaction.atomic()` que verifica la capacidad restante de la transferencia antes de persistir las filas de `PaymentAllocation`.
3. Los datos se almacenan en PostgreSQL en las tres tablas.
4. Las lecturas (`/api/collections/history/`) cargan los cobros con sus asignaciones precargadas (prefetch); `services.collection_balance()` convierte CLP ↔ moneda del cobro con el valor fijo de la UF y deriva estado/pendiente/crédito. El serializer devuelve los montos como strings (sin floats).
5. La página renderiza los badges de estado, los saldos en la moneda original y los desgloses de pagos; después de cada mutación recarga ambas listas para que la UI refleje el nuevo estado.

## 3. Supuestos

- **UF fija = CLP 40.000**, configurable mediante la variable de entorno `UF_VALUE_CLP`.
- **`mes_cobro`** se almacena como una fecha; la convención es el día 1 del mes.
- **La conciliación es aditiva**: una transferencia puede aplicarse a lo largo de múltiples peticiones; la invariante verifica el total acumulado asignado contra el monto de la transferencia.
- **Sobrepagar un cobro está permitido** y se refleja como `crédito` en la moneda del cobro; nunca bloquea la operación (según la especificación).
- Una **transferencia no puede asignar más que su propio monto** — tratado como error duro ($400$), ya que el dinero recibido es un tope real. (Sobrepagar un *cobro* sigue estando permitido; las dos reglas son independientes.)
- Los montos que cruzan la red son **strings** para preservar la precisión decimal de extremo a extremo.
- El redondeo es **half-up a $2$ decimales** tanto para CLP como para UF.

## 4. Preguntas para el equipo de producto

- **Valor de la UF**: ¿debería ser la UF *oficial diaria* (basada en fecha, por `fecha`/`mes_cobro`) en lugar de una constante fija? ¿Qué fecha rige un pago que pasa de mes a otro?
- **Propiedad del crédito**: ¿quién es dueño de un crédito por sobrepago — el contrato? ¿Se arrastra al cobro del mes siguiente, se reembolsa o se retiene?.
- **Remanente no asignado de la transferencia**: si una transferencia no se aplica por completo, ¿debería rastrearse el sobrante como crédito disponible y reutilizarse más adelante? Hoy simplemente queda sin asignar.
- **Ediciones/reversas**: ¿puede un operador corregir o deshacer una asignación? ¿Debería haber una traza de auditoría / borrado lógico en lugar de sobrescritura?
- **Política de redondeo**: ¿es correcto half-up para UF↔CLP, y cuántos decimales para la UF?
- **Reglas de validación**: ¿puede pagarse un cobro antes de su `mes_cobro`? ¿Múltiples cobros por contrato por mes? ¿Debería `glosa` ser obligatoria o parsearse para auto-sugerir coincidencias?
- **Alcance/autenticación**: ¿se necesitará autenticación, aislamiento de datos por usuario y garantías de concurrencia más allá del bloqueo de filas que ya existe en `reconcile()`?