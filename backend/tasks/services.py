"""Domain logic for rent payment reconciliation.

Money is handled with Decimal throughout. Balances are evaluated in the charge's
original currency: CLP amounts received are converted to the charge currency using
a fixed UF value (settings.UF_VALUE_CLP) before comparison.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from tasks.models import BankMovement, Collection, Currency, PaymentAllocation

CENTS = Decimal("0.01")


def uf_value() -> Decimal:
    return Decimal(settings.UF_VALUE_CLP)


def _q(value: Decimal) -> Decimal:
    """Quantize to 2 decimals, half-up — consistent rounding for money."""
    return value.quantize(CENTS, rounding=ROUND_HALF_UP)


def clp_to_currency(amount_clp: Decimal, currency: str) -> Decimal:
    """Convert a CLP amount into the given charge currency."""
    if currency == Currency.UF:
        return _q(amount_clp / uf_value())
    return _q(amount_clp)


def currency_to_clp(amount: Decimal, currency: str) -> Decimal:
    """Convert a charge amount (in its own currency) into CLP."""
    if currency == Currency.UF:
        return _q(amount * uf_value())
    return _q(amount)


@dataclass(frozen=True)
class CollectionBalance:
    """Computed payment state of a collection, expressed in its own currency."""

    expected_clp: Decimal
    paid_clp: Decimal
    expected: Decimal  # in charge currency
    paid: Decimal  # in charge currency
    outstanding: Decimal  # in charge currency, floored at 0
    credit: Decimal  # overpayment in charge currency, floored at 0
    status: str  # pending | partially_paid | paid


def collection_balance(collection: Collection) -> CollectionBalance:
    """Compute the balance for a single collection in its original currency."""
    expected_clp = currency_to_clp(collection.monto_cobro, collection.moneda)
    paid_clp = collection.allocations.aggregate(total=Sum("amount_clp"))["total"] or Decimal("0")
    paid_clp = _q(paid_clp)

    expected = collection.monto_cobro
    paid = clp_to_currency(paid_clp, collection.moneda)
    diff = _q(paid - expected)

    outstanding = -diff if diff < 0 else Decimal("0.00")
    credit = diff if diff > 0 else Decimal("0.00")

    if paid_clp <= 0:
        status = "pending"
    elif outstanding > 0:
        status = "partially_paid"
    else:
        status = "paid"

    return CollectionBalance(
        expected_clp=expected_clp,
        paid_clp=paid_clp,
        expected=expected,
        paid=paid,
        outstanding=outstanding,
        credit=credit,
        status=status,
    )


def movement_allocated_total(movement: BankMovement, exclude_collection_ids: Iterable[int] = ()) -> Decimal:
    """Sum of CLP already allocated from a movement (optionally excluding some pairs)."""
    qs = movement.allocations.all()
    if exclude_collection_ids:
        qs = qs.exclude(collection_id__in=list(exclude_collection_ids))
    return _q(qs.aggregate(total=Sum("amount_clp"))["total"] or Decimal("0"))


@transaction.atomic
def reconcile(movement: BankMovement, items: list[dict]) -> list[PaymentAllocation]:
    """Apply a bank movement to one or more collections.

    `items` is a list of {"collection_id": int, "amount_clp": Decimal}. The total
    applied may not exceed the movement amount. Re-applying to an existing
    (movement, collection) pair updates that allocation. Overpaying a charge is
    allowed (surfaces as credit); it never blocks the operation.
    """
    collection_ids = [item["collection_id"] for item in items]

    # Lock the movement row so concurrent reconcile() calls on the same movement
    # serialized and the capacity check below stays consistent.
    movement = BankMovement.objects.select_for_update().get(pk=movement.pk)

    # New total = amounts in this request + previously allocated amounts to pairs
    # not present in this request.
    requested_total = _q(sum((item["amount_clp"] for item in items), Decimal("0")))
    untouched_total = movement_allocated_total(movement, exclude_collection_ids=collection_ids)
    if _q(requested_total + untouched_total) > _q(movement.monto):
        raise ValidationError(
            {
                "detail": (
                    f"Allocation exceeds movement amount: trying to apply "
                    f"{requested_total + untouched_total} CLP from a {movement.monto} CLP transfer."
                )
            }
        )

    collections = Collection.objects.in_bulk(collection_ids)
    results: list[PaymentAllocation] = []
    for item in items:
        cid = item["collection_id"]
        if cid not in collections:
            raise ValidationError({"detail": f"Collection {cid} does not exist."})
        alloc, _created = PaymentAllocation.objects.update_or_create(
            bank_movement=movement,
            collection=collections[cid],
            defaults={"amount_clp": item["amount_clp"]},
        )
        results.append(alloc)

    return results