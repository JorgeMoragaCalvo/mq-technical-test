from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from tasks import services
from tasks.models import BankMovement, Collection, Currency, PaymentAllocation

pytestmark = pytest.mark.django_db


def make_collection(monto, moneda, contract_id=123, mes="2026-04-01"):
    return Collection.objects.create(
        contract_id=contract_id,
        mes_cobro=mes,
        monto_cobro=Decimal(monto),
        moneda=moneda,
    )


def make_movement(monto, fecha="2026-04-05", glosa="transfer"):
    return BankMovement.objects.create(fecha=fecha, glosa=glosa, monto=Decimal(monto))


# --- Conversion -----------------------------------------------------------

def test_uf_to_clp_conversion():
    assert services.currency_to_clp(Decimal("2"), Currency.UF) == Decimal("80000.00")
    assert services.clp_to_currency(Decimal("80000"), Currency.UF) == Decimal("2.00")
    assert services.currency_to_clp(Decimal("5000"), Currency.CLP) == Decimal("5000.00")


# --- Balance status -------------------------------------------------------

def test_pending_when_no_payments():
    col = make_collection("2", Currency.UF)
    bal = services.collection_balance(col)
    assert bal.status == "pending"
    assert bal.outstanding == Decimal("2.00")
    assert bal.credit == Decimal("0.00")


def test_partial_payment_uf_in_original_currency():
    col = make_collection("2", Currency.UF)  # expects CLP 80,000
    mov = make_movement("40000")
    services.reconcile(mov, [{"collection_id": col.id, "amount_clp": Decimal("40000")}])
    bal = services.collection_balance(col)
    assert bal.status == "partially_paid"
    assert bal.paid == Decimal("1.00")  # UF
    assert bal.outstanding == Decimal("1.00")  # UF


def test_exact_payment_marks_paid():
    col = make_collection("2", Currency.UF)
    mov = make_movement("80000")
    services.reconcile(mov, [{"collection_id": col.id, "amount_clp": Decimal("80000")}])
    bal = services.collection_balance(col)
    assert bal.status == "paid"
    assert bal.outstanding == Decimal("0.00")
    assert bal.credit == Decimal("0.00")


def test_overpayment_becomes_credit():
    col = make_collection("1", Currency.UF)  # expects CLP 40,000
    mov = make_movement("50000")
    services.reconcile(mov, [{"collection_id": col.id, "amount_clp": Decimal("50000")}])
    bal = services.collection_balance(col)
    assert bal.status == "paid"
    assert bal.credit == Decimal("0.25")  # UF
    assert bal.outstanding == Decimal("0.00")


# --- Reconcile invariants -------------------------------------------------

def test_cannot_allocate_more_than_movement():
    col1 = make_collection("1", Currency.UF)
    col2 = make_collection("1", Currency.UF)
    mov = make_movement("40000")
    with pytest.raises(Exception):
        services.reconcile(
            mov,
            [
                {"collection_id": col1.id, "amount_clp": Decimal("30000")},
                {"collection_id": col2.id, "amount_clp": Decimal("30000")},
            ],
        )
    assert PaymentAllocation.objects.count() == 0  # atomic rollback


def test_split_one_movement_pays_many_charges():
    col1 = make_collection("1", Currency.UF)  # 40,000
    col2 = make_collection("40000", Currency.CLP)
    mov = make_movement("80000")
    services.reconcile(
        mov,
        [
            {"collection_id": col1.id, "amount_clp": Decimal("40000")},
            {"collection_id": col2.id, "amount_clp": Decimal("40000")},
        ],
    )
    assert services.collection_balance(col1).status == "paid"
    assert services.collection_balance(col2).status == "paid"


def test_many_movements_pay_one_charge():
    col = make_collection("2", Currency.UF)  # 80,000
    services.reconcile(make_movement("30000"), [{"collection_id": col.id, "amount_clp": Decimal("30000")}])
    services.reconcile(make_movement("50000"), [{"collection_id": col.id, "amount_clp": Decimal("50000")}])
    bal = services.collection_balance(col)
    assert bal.status == "paid"
    assert col.allocations.count() == 2


# --- API ------------------------------------------------------------------

def test_reconcile_endpoint_and_history():
    client = APIClient()
    col = client.post(
        "/api/collections/",
        {"contract_id": 1, "mes_cobro": "2026-04-01", "monto_cobro": "2", "moneda": "UF"},
        format="json",
    ).data
    mov = client.post(
        "/api/bank-movements/",
        {"fecha": "2026-04-05", "glosa": "abono", "monto": "80000"},
        format="json",
    ).data

    resp = client.post(
        f"/api/bank-movements/{mov['id']}/reconcile/",
        {"allocations": [{"collection_id": col["id"], "amount_clp": "80000"}]},
        format="json",
    )
    assert resp.status_code == 200

    history = client.get("/api/collections/history/").data
    entry = next(c for c in history if c["id"] == col["id"])
    assert entry["status"] == "paid"
    assert len(entry["payments"]) == 1
    assert entry["payments"][0]["amount_clp"] == "80000.00"


def test_reconcile_endpoint_rejects_over_allocation():
    client = APIClient()
    col = client.post(
        "/api/collections/",
        {"contract_id": 1, "mes_cobro": "2026-04-01", "monto_cobro": "1", "moneda": "CLP"},
        format="json",
    ).data
    mov = client.post(
        "/api/bank-movements/",
        {"fecha": "2026-04-05", "glosa": "abono", "monto": "1000"},
        format="json",
    ).data
    resp = client.post(
        f"/api/bank-movements/{mov['id']}/reconcile/",
        {"allocations": [{"collection_id": col["id"], "amount_clp": "2000"}]},
        format="json",
    )
    assert resp.status_code == 400