from django.contrib import admin

from tasks.models import BankMovement, Collection, PaymentAllocation


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ["id", "contract_id", "mes_cobro", "monto_cobro", "moneda", "created_at"]
    list_filter = ["moneda"]


@admin.register(BankMovement)
class BankMovementAdmin(admin.ModelAdmin):
    list_display = ["id", "fecha", "glosa", "monto", "created_at"]


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ["id", "bank_movement", "collection", "amount_clp", "created_at"]