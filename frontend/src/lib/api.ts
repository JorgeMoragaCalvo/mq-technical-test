import type {
  BankMovement,
  Collection,
  CollectionHistory,
  NewBankMovement,
  NewCollection,
  ReconcileItem,
} from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  } catch {
    throw new ApiError("No se pudo conectar con la API.", 0)
  }

  if (!response.ok) {
    let detail = `Error ${response.status}`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === "object" && "detail" in body) {
        detail = String((body as { detail: unknown }).detail)
      } else {
        detail = JSON.stringify(body)
      }
    } catch {
      // keep the default message
    }
    throw new ApiError(detail, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function listCollections(): Promise<readonly CollectionHistory[]> {
  return request<readonly CollectionHistory[]>("/api/collections/history/")
}

export function createCollection(payload: NewCollection): Promise<Collection> {
  return request<Collection>("/api/collections/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function listBankMovements(): Promise<readonly BankMovement[]> {
  return request<readonly BankMovement[]>("/api/bank-movements/")
}

export function createBankMovement(payload: NewBankMovement): Promise<BankMovement> {
  return request<BankMovement>("/api/bank-movements/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function reconcile(
  movementId: number,
  allocations: readonly ReconcileItem[],
): Promise<readonly CollectionHistory[]> {
  return request<readonly CollectionHistory[]>(`/api/bank-movements/${movementId}/reconcile/`, {
    method: "POST",
    body: JSON.stringify({ allocations }),
  })
}