"use client"

import { FormEvent, useState } from "react"

import { ApiError, createBankMovement } from "@/lib/api"

import { Button, Card, ErrorText, Field, Input, Row, SectionTitle } from "./ui"

type Props = {
  readonly onCreated: () => void
}

export default function BankMovementForm({ onCreated }: Props): JSX.Element {
  const [fecha, setFecha] = useState("")
  const [glosa, setGlosa] = useState("")
  const [monto, setMonto] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createBankMovement({ fecha, glosa, monto })
      setFecha("")
      setGlosa("")
      setMonto("")
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionTitle>Nueva transferencia (BankMovement)</SectionTitle>
      <form onSubmit={handleSubmit}>
        <Row>
          <Field>
            Fecha
            <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field>
            Glosa
            <Input type="text" value={glosa} onChange={(e) => setGlosa(e.target.value)} />
          </Field>
          <Field>
            Monto (CLP)
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear transferencia"}
          </Button>
        </Row>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </form>
    </Card>
  )
}