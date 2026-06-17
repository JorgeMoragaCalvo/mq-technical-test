"use client"

import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import BankMovementForm from "@/components/BankMovementForm"
import CollectionForm from "@/components/CollectionForm"
import HistoryPanel from "@/components/HistoryPanel"
import ReconcilePanel from "@/components/ReconcilePanel"
import { ErrorText, Muted } from "@/components/ui"
import { ApiError, listBankMovements, listCollections } from "@/lib/api"
import type { BankMovement, CollectionHistory } from "@/types"

const Wrapper = styled.main`
  max-width: 1040px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const Title = styled.h1`
  margin: 0;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export default function TasksPage(): JSX.Element {
  const [collections, setCollections] = useState<readonly CollectionHistory[]>([])
  const [movements, setMovements] = useState<readonly BankMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [cols, movs] = await Promise.all([listCollections(), listBankMovements()])
      setCollections(cols)
      setMovements(movs)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado al cargar datos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <Wrapper>
      <header>
        <Title>Conciliación de pagos de arriendo</Title>
        <Muted>Crea cobros y transferencias, concílialos y revisa el historial.</Muted>
      </header>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading ? <Muted>Cargando...</Muted> : null}

      <Grid>
        <CollectionForm onCreated={reload} />
        <BankMovementForm onCreated={reload} />
      </Grid>

      <ReconcilePanel movements={movements} collections={collections} onReconciled={reload} />

      <HistoryPanel collections={collections} />
    </Wrapper>
  )
}