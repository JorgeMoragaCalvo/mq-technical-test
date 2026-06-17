from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Currency(models.TextChoices):
    CLP = "CLP", "CLP"
    UF = "UF", "UF"


class Collection(models.Model):
    """A monthly rent charge for a contract, denominated in CLP or UF."""

    contract_id = models.PositiveIntegerField()
    mes_cobro = models.DateField(help_text="Month being charged (use the 1st of the month).")
    monto_cobro = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    moneda = models.CharField(max_length=3, choices=Currency.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    payments = models.ManyToManyField(
        "BankMovement",
        through="PaymentAllocation",
        related_name="collections",
    )

    class Meta:
        ordering = ["-mes_cobro", "contract_id"]

    def __str__(self) -> str:
        return f"Collection #{self.pk} contract={self.contract_id} {self.monto_cobro} {self.moneda}"


class BankMovement(models.Model):
    """An actual bank transfer received. Always in CLP, amount > 0."""

    fecha = models.DateField()
    glosa = models.CharField(max_length=255, blank=True)
    monto = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self) -> str:
        return f"BankMovement #{self.pk} {self.monto} CLP ({self.fecha})"


class PaymentAllocation(models.Model):
    """How much (in CLP) of a given BankMovement is applied to a given Collection.

    This is the through model that carries the allocated amount on the
    many-to-many relationship between BankMovement and Collection.
    """

    bank_movement = models.ForeignKey(
        BankMovement,
        on_delete=models.CASCADE,
        related_name="allocations",
    )
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name="allocations",
    )
    amount_clp = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Amount of the transfer applied to this charge, in CLP.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["bank_movement", "collection"],
                name="unique_movement_collection_allocation",
            ),
        ]

    def __str__(self) -> str:
        return f"Alloc {self.amount_clp} CLP: movement={self.bank_movement_id} -> collection={self.collection_id}"