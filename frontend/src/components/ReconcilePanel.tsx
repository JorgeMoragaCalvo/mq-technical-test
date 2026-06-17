"use client"

import { useMemo, useState } from "react"

import { ApiError, reconcile } from "@/lib/api"
import type { BankMovement, CollectionHistory, ReconcileItem } from "@/types"

import { Badge, Button, Card, ErrorText, Input, Muted, Row, SectionTitle, Select, Table } from "./ui"

type Props = {
  readonly movements: readonly BankMovement[]
  readonly collections: readonly CollectionHistory[]
  readonly onReconciled: () => void
}

export default function ReconcilePanel({ movements, collections, onReconciled }: Props): JSX.Element {
  const [movementId, setMovementId] = useState<number | "">("")
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedMovement = movements.find((m) => m.id === movementId)

  const assignedTotal = useMemo(
    () => Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [amounts],
  )
  const capacity = selectedMovement ? Number(selectedMovement.monto) : 0
  const remaining = capacity - assignedTotal
  const overAllocated = remaining < -0.001

  function setAmount(collectionId: number, value: string): void {
    setAmounts((prev) => ({ ...prev, [collectionId]: value }))
  }

  async function handleSubmit(): Promise<void> {
    if (movementId === "") {
      return
    }
    const allocations: ReconcileItem[] = Object.entries(amounts)
      .filter(([, value]) => Number(value) > 0)
      .map(([collectionId, value]) => ({ collection_id: Number(collectionId), amount_clp: value }))

    if (allocations.length === 0) {
      setError("Asigna un monto a al menos un cobro.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await reconcile(movementId, allocations)
      setAmounts({})
      setMovementId("")
      onReconciled()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  const pending = collections.filter((c) => c.status !== "paid")

  return (
    <Card>
      <SectionTitle>Conciliar transferencia con cobros</SectionTitle>
      <Row>
        <Select
          value={movementId}
          onChange={(e) => {
            setMovementId(e.target.value === "" ? "" : Number(e.target.value))
            setAmounts({})
            setError(null)
          }}
        >
          <option value="">Selecciona una transferencia...</option>
          {movements.map((m) => (
            <option key={m.id} value={m.id}>
              #{m.id} · {m.fecha} · {m.glosa || "(sin glosa)"} · CLP {m.monto}
            </option>
          ))}
        </Select>
      </Row>

      {selectedMovement ? (
        <>
          <p>
            <Muted>
              Capacidad CLP {capacity.toLocaleString("es-CL")} · Asignado CLP{" "}
              {assignedTotal.toLocaleString("es-CL")} · Restante{" "}
            </Muted>
            <strong style={{ color: overAllocated ? "#b91c1c" : "#166534" }}>
              CLP {remaining.toLocaleString("es-CL")}
            </strong>
          </p>

          <Table>
            <thead>
              <tr>
                <th>Cobro</th>
                <th>Contrato</th>
                <th>Pendiente</th>
                <th>Estado</th>
                <th>Aplicar (CLP)</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <Muted>No hay cobros pendientes.</Muted>
                  </td>
                </tr>
              ) : (
                pending.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{c.contract_id}</td>
                    <td>
                      {c.outstanding} {c.moneda}
                    </td>
                    <td>
                      <Badge $status={c.status}>{c.status}</Badge>
                    </td>
                    <td>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amounts[c.id] ?? ""}
                        onChange={(e) => setAmount(c.id, e.target.value)}
                        style={{ width: "120px" }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <Row style={{ marginTop: "1rem" }}>
            <Button type="button" onClick={handleSubmit} disabled={loading || overAllocated}>
              {loading ? "Conciliando..." : "Conciliar"}
            </Button>
            {overAllocated ? <Muted>El monto asignado supera la transferencia.</Muted> : null}
          </Row>
        </>
      ) : (
        <Muted>Selecciona una transferencia para asignarla a uno o más cobros.</Muted>
      )}

      {error ? <ErrorText>{error}</ErrorText> : null}
    </Card>
  )
}