# Fullstack Technical Test

**Stack:** Django + DRF + PostgreSQL + Docker + Next.js

## Objective

Build a rent payment reconciliation module with a complete flow:

```txt
Frontend (Next.js) -> API (Django) -> PostgreSQL -> Frontend
```

We want to see how you model a real-world domain, how you structure both the backend and frontend, and what judgment you apply when the specification does not define everything explicitly. You may (and are expected to) use AI, but we evaluate your critical thinking regarding what it produces.

## Prerequisites

* Docker Desktop
* Python 3.11+
* Node.js 20+
* Yarn
* PDM

## Setup

### 1) Database

```bash
docker compose --file "docker-compose.yml" up -d
```

### 2) Backend

```bash
cd backend
cp .env.example .env
pdm install
pdm migrate
pdm dev
```

Backend: `http://localhost:8000`

### 3) Frontend

```bash
cd frontend
cp .env.example .env.local
yarn install
yarn dev
```

Frontend: `http://localhost:3000/tasks`

## Domain Context

Each month, we generate rent charges for each contract and, separately, receive actual bank transfers. The operational task consists of **reconciling** them: deciding which transfers pay which charges.

Two concepts:

* **Collection**: A monthly rent charge. It has its own currency (CLP or UF). Example: April 2026 rent for contract 123, amounting to UF 2.

  ```json
  {
    "contract_id": 123,
    "mes_cobro": "2026-04-01",
    "monto_cobro": 2,
    "moneda": "UF"
  }
  ```

* **BankMovement**: An actual bank transfer received. It is **always in CLP**, with an amount greater than 0.

The relationship between them is many-to-many:

* A charge can be paid through multiple transfers (partial or split payments).
* A transfer can pay multiple charges.

## Business Rules

* **Currency conversion**: Transfers always arrive in CLP. To pay a charge in UF, use a **fixed UF value of CLP 40,000**.
* **Outstanding balance** is determined by comparing the amount paid against the amount charged, **in the original currency of the charge**. Simply summing CLP amounts is not enough: a UF-denominated charge is considered paid only when the amount received is equivalent to its UF value.
* **Overpayments**: If a transfer contributes more than a charge requires, the excess remains as **credit balance** (it is not lost and does not block the operation).

## Models

These are the **minimum** required fields. You may (and will probably need to) add additional models and fields.

### `Collection`

* `collection_id`
* `contract_id`
* `mes_cobro`
* `monto_cobro`
* `moneda` (CLP or UF)

### `BankMovement`

* `bank_movement_id`
* `fecha`
* `glosa`
* `monto` (CLP, > 0)

## Backend

Implement models, migrations, serializers, views, and URLs.

At a minimum, the API must allow:

* Creating and listing `Collection`.
* Creating and listing `BankMovement`.
* Associating **one** `BankMovement` with one or more `Collection` records to pay them (including partial payments).
* Retrieving the collection history, distinguishing between pending and paid charges, and for those with payments, displaying the details of which transfers paid them and for how much.

The design of routes and resources is up to you. Maintain the functional scope described above.

## Frontend

Implement, at a minimum:

* Creating `Collection` and `BankMovement`.
* A reconciliation workflow: select a `BankMovement` and assign it to one or more charges, specifying how much is applied to each one.
* Collection history: pending and paid charges, and for each charge with payments, the details of those payments (which transfers and how much each contributed).
* Basic loading and error handling.

## Technical Rules

* Use `NEXT_PUBLIC_API_URL`.
* Use `styled-components`.
* In TypeScript, do not use `any`.
* Do not modify the repository's base setup.

## Deliverables

1. Functional code.
2. A list of implemented and pending features.
3. A brief explanation of the end-to-end data flow.
4. **Assumptions and Questions**: list the assumptions you made where the specification was not explicit, and the questions you would ask the product team before taking this to production.
