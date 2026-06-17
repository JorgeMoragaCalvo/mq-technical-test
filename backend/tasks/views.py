from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tasks import services
from tasks.models import BankMovement, Collection
from tasks.serializers import (
    BankMovementSerializer,
    CollectionHistorySerializer,
    CollectionSerializer,
    ReconcileSerializer,
)


class CollectionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create/list collections; `history` returns balances + payment breakdown."""

    queryset = Collection.objects.all().prefetch_related("allocations__bank_movement")

    def get_serializer_class(self):  # noqa: ANN201
        if self.action in {"list", "retrieve", "history"}:
            return CollectionHistorySerializer
        return CollectionSerializer

    @action(detail=False, methods=["get"])
    def history(self, request, *args, **kwargs):  # noqa: ARG002, ANN201
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class BankMovementViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create/list bank movements; `reconcile` applies one to many collections."""

    queryset = BankMovement.objects.all()
    serializer_class = BankMovementSerializer

    @action(detail=True, methods=["post"])
    def reconcile(self, request, *args, **kwargs):  # noqa: ARG002, ANN201
        movement = self.get_object()
        serializer = ReconcileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reconcile(movement, serializer.validated_data["allocations"])

        collections = Collection.objects.filter(
            id__in=[item["collection_id"] for item in serializer.validated_data["allocations"]]
        ).prefetch_related("allocations__bank_movement")
        return Response(
            CollectionHistorySerializer(collections, many=True).data,
            status=status.HTTP_200_OK,
        )