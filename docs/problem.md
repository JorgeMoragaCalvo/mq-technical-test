The main problem is reconciliation across two independent, mismatched data streams — and specifically doing it correctly when the two sides aren't even in the same currency.

Strip away the CRUD and the UI, and the core problem is this:

> You have a set of obligations (rent charges, some in UF, some in CLP) and a set of payments (bank transfers, always in CLP). Neither side knows about the other. You must decide which payments settle which obligations, and by how much, then accurately answer "what is still owed?"
  
Everything hard about the task radiates from that single sentence:
1. The matching is many-to-many with partial amounts. A payment isn't "for" one charge — it can be split across several, and a charge can be filled by several payments. So the real unit of work isn't the transfer or the charge, it's the allocation between them (a transfer applying X CLP to a specific charge). That allocation, with its amount, is the central piece of the model. Get this wrong and nothing else works.
2. "Settled" is defined in a different currency than the money you receive. Payments arrive in CLP, but a UF charge's balance must be judged in UF. So every comparison requires conversion (the fixed 40,000), and you can't just sum CLP across mixed-currency charges. This is the conceptual trap the test is really probing.
3. The arithmetic must never lose or block money. Overpayment becomes credit, partial payment is valid, and the operation still succeeds. The system has to stay consistent and balanced no matter how messy the real-world inputs are.

So if someone asked me to name it in one breath: it's a currency-aware, many-to-many allocation/balance problem. The Django/Next/Postgres plumbing is just scaffolding around that core. The reason this makes a good technical test is that the spec deliberately leaves the edges undefined (rounding, credit ownership, reversals, over-allocating a transfer), so solving it well means not just coding the matching but showing judgment about the rules the matching should obey.

# Solution
## 1. The data model: allocation as a first-class entity

The spec only says the relationship is "many-to-many" and shows two models. It does not say where the allocated amount lives.

- Decision: a PaymentAllocation through-model carrying amount_clp per (movement, collection) pair (models.py:57).
- Criterion: a plain M2M can only record that a transfer paid a charge, not how much. Partial/split payments are explicit in the spec, so the link must carry a quantity. Putting it on the join row is the normalized choice.
- Alternative rejected: storing a "paid amount" on the Collection — that can't represent split payments and loses the audit of which transfer contributed what.

## 2. Currency of the allocation amount

The spec says transfers are CLP and charges may be UF, but never says what currency the allocation is recorded in.

- Decision: allocations are stored in CLP (amount_clp), and conversion to the charge's currency happens only at read time in collection_balance().
- Criterion: CLP is the only currency that is actually received and immutable. The UF value is a policy constant that could change; storing CLP keeps the ledger truthful and pushes the conversion to a single, swappable place. Store facts, derive opinions.

## 3. What "outstanding balance in original currency" operationally means

The spec gives the rule but not the arithmetic or rounding.

- Decisions: Decimal everywhere; quantize to $2$ decimals, ROUND_HALF_UP; UF carried to $2$ decimals; amounts crossed over the wire as strings.
- Criterion: money never touches floats; rounding must be a single documented policy, or balances won't reconcile to the cent. Half-up at $2$ decimals is the conventional default — but note this is a real assumption: UF in Chile is officially carried to more decimals, so "paid" can round in ways the product team may dispute.
- This is the subtlest one: the "paid" amount is computed by converting the summed CLP to UF once, not by summing per-transfer UF conversions. That avoids compounding rounding error, but it's an undocumented choice.

## 4. Two independent ceilings — and which one is hard

The spec says overpaying a charge is allowed (credit). It says nothing about overdrawing a transfer.

- Decision: overpaying a charge → soft (becomes credit); over-allocating a transfer beyond its monto → hard 400 error (services.py:121).
- Criterion: a charge amount is a target you can exceed; a transfer amount is money that physically exists — you cannot allocate CLP you didn't receive. Treating the two symmetrically would be wrong. Recognizing their independent rules is the senior insight here.

## 5. Reconciliation semantics: additive + idempotent upsert

The spec says "associate a transfer with charges." It doesn't define what happens on repeat calls or whether reconciliation is one-shot.

- Decision: update_or_create on the (movement, collection) pair — re-applying updates rather than adds (services.py:137); the capacity check sums cumulative allocations across requests (services.py:120).
- Criterion: makes the endpoint idempotent and lets an operator reconcile a transfer over several sessions. The cost: there's no way to add to an existing pair, and no delete — a correction means re-sending the full amount. A reasonable v1 trade, explicitly noted as a gap in SOLUTION.md.

## 6. Concurrency — not mentioned at all

The spec is single-user in tone.

- Decision: select_for_update() row locks on the movement and its allocations inside transaction.atomic() (services.py:111-115).
- Criterion: the capacity invariant (don't exceed the transfer) is a classic check-then-write race. Without the lock, two concurrent reconciliations could each pass the check and jointly overdraw. Defending the invariant at the DB level is the correct instinct even when the brief doesn't ask for it.

## 7. Status taxonomy

The spec asks only to distinguish pending vs. paid.

- Decision: a third state, partially_paid (services.py:73-78).
- Criterion: a binary flag hides the most operationally interesting case in reconciliation — a charge that's been touched but isn't settled. Adding the middle state is a small extension that materially improves the UI's usefulness.

## 8. Semantics of the fields the spec under-specifies

- mes_cobro stored as a DateField with the 1st-of-month convention — the spec shows "2026-04-01" but never says it's a date vs a month string.
- glosa is optional (blank=True) — the spec doesn't say. In reality, glosa is often the matching key, so making it required (or parsing it) is a live product question.
- No uniqueness on (contract, month) — the spec doesn't forbid multiple charges per contract per month, so the code allows it.

---
  
The through-table, the store-CLP-derive-UF split, and the two-independent-ceilings distinction are the three calls I'd highlight in a review as genuine senior judgment — the rest are sensible defaults. The honest gaps the product team should rule on (UF as a daily official value vs fixed constant, who owns a credit, reversibility/audit trail) are already captured in SOLUTION.md §4, which is the right place for them.