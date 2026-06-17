from rest_framework.routers import DefaultRouter

from tasks.views import BankMovementViewSet, CollectionViewSet

router = DefaultRouter()
router.register("collections", CollectionViewSet, basename="collection")
router.register("bank-movements", BankMovementViewSet, basename="bank-movement")

urlpatterns = router.urls