# The big picture

You're building a rent payment reconciliation module. "Reconciliation" is the key word — it's the accounting process of matching two independent streams of data:

1. What we expected to receive → monthly rent charges (Collection)
2. What we actually received → bank transfers (BankMovement)

The job of the module is to let an operator say "this transfer pays these charges, this much to each" and then report what's still owed and what's been paid.

The flow is end-to-end: Next.js frontend → Django/DRF API → PostgreSQL → back to the frontend.

⚠️ Trap to avoid first: the repo ships with a stale tasks scaffold (views returning HTTP 501, /api/tasks/ routes, a /tasks page talking about "ingreso/egreso" and "19% tax"). That is a leftover boilerplate from a different spec. Ignore it as a contract — it's there to be replaced, not honored.

## The two core entities
Collection — a monthly charge. Crucially, it has its own currency: CLP or UF.
```json
{ 
  "contract_id": 123, 
  "mes_cobro": "2026-04-01", 
  "monto_cobro": 2, 
  "moneda": "UF"
}
```
  

BankMovement — a real transfer. Always CLP, always > 0.

The relationship is many-to-many, and this is the heart of the domain:
- One charge can be paid by several transfers (partial / split payments).
- One transfer can pay several charges.

That M2M needs a through/join table carrying how much of a transfer was applied to each charge (an amount_applied field). A plain ManyToManyField isn't enough — the allocation amount lives on the relationship itself.

## The business rules that are easy to get wrong

These are where they're judging your critical thinking, so treat them carefully:
1. Currency conversion is fixed. 1 UF = CLP 40,000. No external API, no historical UF table — a constant. (You'd flag in your "Questions" section that real production needs the daily UF value.)
2. Outstanding balance is measured in the charge's original currency. This is the subtle one. A UF charge isn't "paid" by naively summing CLP. You convert: a UF 2 charge = CLP 80,000 worth of obligation. You sum the CLP applied to it, convert back (or compare in CLP), and decide pending vs. paid relative to the charge's currency. Don't just add CLP across mixed-currency charges.
3. Overpayment becomes credit balance. If a transfer applies more than a charge needs, the excess is not lost and does not block the operation. You keep it as credit. (Another good "Question": credit for whom — the contract? carried to next month?)

## What you actually have to build

Backend (Django + DRF): models, migrations, serializers, views, URLs. Minimum API:
- Create + list Collection
- Create + list BankMovement
- Associate one BankMovement with one or more Collections (with per-charge amounts, partial allowed) — this is the reconciliation endpoint and the most interesting piece
- Collection history: pending vs. paid, and for paid ones, which transfers paid them and how much

Route design is your call — you can scrap /api/tasks/.

Frontend (Next.js App Router + styled-components, strict TS):
- Forms to create Collection and BankMovement
- A reconciliation workflow: pick a transfer → assign it to one or more charges → specify the amount per charge
- History view: pending/paid charges + payment breakdown per charge
- Loading & error states

## Hard technical constraints (non-negotiable, they'll check)

- Frontend API base URL must come from NEXT_PUBLIC_API_URL
- Styling must be styled-components (SSR registry is already wired — reuse it, don't rebuild)
- No any in TypeScript (it's strict)
- Don't modify base setup (docker-compose.yml, toolchains). If a port clashes, use an additive override file
- Use the pinned tooling: PDM (backend), Yarn 4 (frontend) — not pip/npm

## The deliverables (don't forget the non-code ones)

This is graded as much on judgment as on code:
1. Functional code
2. List of implemented vs. pending features
3. A short explanation of the end-to-end data flow
4. Assumptions & Questions — where the spec was silent, what you assumed, and what you'd ask the product team before production

That last one is the "senior" signal. Examples worth listing: Should the fixed UF value be configurable / date-based? Can a transfer be partially unallocated (left as credit)? Can allocations be edited/reversed? Should reconciliation be atomic and prevent over-allocating a single transfer beyond its amount? What rounding rules apply on UF↔CLP conversion?

---
  
That's the full shape of the task. The interesting engineering is concentrated in two spots: the M2M-with-amount allocation model and the currency-aware balance logic.
