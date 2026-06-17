"use client"

import type { CollectionHistory } from "@/types"

import { Badge, Card, Muted, SectionTitle, Table } from "./ui"

type Props = {
  readonly collections: readonly CollectionHistory[]
}

export default function HistoryPanel({ collections }: Props): JSX.Element {
  return (
    <Card>
      <SectionTitle>Historial de cobros</SectionTitle>
      {collections.length === 0 ? (
        <Muted>No hay cobros registrados.</Muted>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>Contrato</th>
              <th>Mes</th>
              <th>Cobrado</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Crédito</th>
              <th>Estado</th>
              <th>Pagos</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.contract_id}</td>
                <td>{c.mes_cobro}</td>
                <td>
                  {c.expected} {c.moneda}
                </td>
                <td>
                  {c.paid} {c.moneda}
                </td>
                <td>
                  {c.outstanding} {c.moneda}
                </td>
                <td>
                  {Number(c.credit) > 0 ? `${c.credit} ${c.moneda}` : "—"}
                </td>
                <td>
                  <Badge $status={c.status}>{c.status}</Badge>
                </td>
                <td>
                  {c.payments.length === 0 ? (
                    <Muted>—</Muted>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                      {c.payments.map((p) => (
                        <li key={p.id}>
                          Transf. #{p.bank_movement_id}: CLP {p.amount_clp}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}