from decimal import Decimal

from rest_framework import serializers

from tasks import services
from tasks.models import BankMovement, Collection, PaymentAllocation


class BankMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankMovement
        fields = ["id", "fecha", "glosa", "monto", "created_at"]
        read_only_fields = ["id", "created_at"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "contract_id", "mes_cobro", "monto_cobro", "moneda", "created_at"]
        read_only_fields = ["id", "created_at"]


class AllocationDetailSerializer(serializers.ModelSerializer):
    """One payment line on a collection's history: which transfer, how much."""

    bank_movement_id = serializers.IntegerField(source="bank_movement.id", read_only=True)
    fecha = serializers.DateField(source="bank_movement.fecha", read_only=True)
    glosa = serializers.CharField(source="bank_movement.glosa", read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = ["id", "bank_movement_id", "fecha", "glosa", "amount_clp", "created_at"]


class CollectionHistorySerializer(serializers.ModelSerializer):
    """Read serializer: collection + computed balance + payment breakdown."""

    status = serializers.SerializerMethodField()
    expected = serializers.SerializerMethodField()
    paid = serializers.SerializerMethodField()
    paid_clp = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()
    credit = serializers.SerializerMethodField()
    payments = AllocationDetailSerializer(source="allocations", many=True, read_only=True)

    class Meta:
        model = Collection
        fields = [
            "id",
            "contract_id",
            "mes_cobro",
            "monto_cobro",
            "moneda",
            "status",
            "expected",
            "paid",
            "paid_clp",
            "outstanding",
            "credit",
            "payments",
            "created_at",
        ]

    @staticmethod
    def _balance(obj: Collection) -> services.CollectionBalance:
        cache = getattr(obj, "_balance_cache", None)
        if cache is None:
            cache = services.collection_balance(obj)
            obj._balance_cache = cache
        return cache

    def get_status(self, obj: Collection) -> str:
        return self._balance(obj).status

    def get_expected(self, obj: Collection) -> str:
        return str(self._balance(obj).expected)

    def get_paid(self, obj: Collection) -> str:
        return str(self._balance(obj).paid)

    def get_paid_clp(self, obj: Collection) -> str:
        return str(self._balance(obj).paid_clp)

    def get_outstanding(self, obj: Collection) -> str:
        return str(self._balance(obj).outstanding)

    def get_credit(self, obj: Collection) -> str:
        return str(self._balance(obj).credit)


class ReconcileItemSerializer(serializers.Serializer):
    collection_id = serializers.IntegerField()
    amount_clp = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))


class ReconcileSerializer(serializers.Serializer):
    """Input for applying one bank movement to one or more collections."""

    allocations = ReconcileItemSerializer(many=True)

    @staticmethod
    def validate_allocations(value: list[dict]) -> list[dict]:
        if not value:
            raise serializers.ValidationError("At least one allocation is required.")
        seen = set()
        for item in value:
            cid = item["collection_id"]
            if cid in seen:
                raise serializers.ValidationError(f"Duplicate collection {cid} in request.")
            seen.add(cid)
        return value