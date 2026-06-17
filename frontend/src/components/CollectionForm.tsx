"use client"

import { FormEvent, useState } from "react"

import { ApiError, createCollection } from "@/lib/api"
import type { Currency } from "@/types"

import { Button, Card, ErrorText, Field, Input, Row, SectionTitle, Select } from "./ui"

type Props = {
  readonly onCreated: () => void
}

export default function CollectionForm({ onCreated }: Props): JSX.Element {
  const [contractId, setContractId] = useState("")
  const [mesCobro, setMesCobro] = useState("")
  const [montoCobro, setMontoCobro] = useState("")
  const [moneda, setMoneda] = useState<Currency>("CLP")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createCollection({
        contract_id: Number(contractId),
        mes_cobro: mesCobro,
        monto_cobro: montoCobro,
        moneda,
      })
      setContractId("")
      setMesCobro("")
      setMontoCobro("")
      setMoneda("CLP")
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionTitle>Nuevo cobro (Collection)</SectionTitle>
      <form onSubmit={handleSubmit}>
        <Row>
          <Field>
            Contrato
            <Input
              type="number"
              min={1}
              required
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
          </Field>
          <Field>
            Mes de cobro
            <Input type="date" required value={mesCobro} onChange={(e) => setMesCobro(e.target.value)} />
          </Field>
          <Field>
            Monto
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={montoCobro}
              onChange={(e) => setMontoCobro(e.target.value)}
            />
          </Field>
          <Field>
            Moneda
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)}>
              <option value="CLP">CLP</option>
              <option value="UF">UF</option>
            </Select>
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear cobro"}
          </Button>
        </Row>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </form>
    </Card>
  )
}