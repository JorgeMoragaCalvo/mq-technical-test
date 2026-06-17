export type Currency = "CLP" | "UF"

export type CollectionStatus = "pending" | "partially_paid" | "paid"

export interface Collection {
  readonly id: number
  readonly contract_id: number
  readonly mes_cobro: string
  readonly monto_cobro: string
  readonly moneda: Currency
  readonly created_at: string
}

export interface BankMovement {
  readonly id: number
  readonly fecha: string
  readonly glosa: string
  readonly monto: string
  readonly created_at: string
}

export interface PaymentDetail {
  readonly id: number
  readonly bank_movement_id: number
  readonly fecha: string
  readonly glosa: string
  readonly amount_clp: string
  readonly created_at: string
}

export interface CollectionHistory {
  readonly id: number
  readonly contract_id: number
  readonly mes_cobro: string
  readonly monto_cobro: string
  readonly moneda: Currency
  readonly status: CollectionStatus
  readonly expected: string
  readonly paid: string
  readonly paid_clp: string
  readonly outstanding: string
  readonly credit: string
  readonly payments: readonly PaymentDetail[]
  readonly created_at: string
}

export interface NewCollection {
  readonly contract_id: number
  readonly mes_cobro: string
  readonly monto_cobro: string
  readonly moneda: Currency
}

export interface NewBankMovement {
  readonly fecha: string
  readonly glosa: string
  readonly monto: string
}

export interface ReconcileItem {
  readonly collection_id: number
  readonly amount_clp: string
}