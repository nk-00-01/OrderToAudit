
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    ForeignKey,
    Numeric,
    Float,
    CheckConstraint,
    DateTime,
    func
)
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import UniqueConstraint

from database import Base


# 1. ROLES TABLE
class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )


# 2. USERS TABLE
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )


# 3. PRODUCTS TABLE
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    sku: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(120), nullable=False
    )
    unit: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    selling_price: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    gst_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )


# 4. RAW MATERIALS TABLE
class RawMaterial(Base):
    __tablename__ = "raw_materials"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    sku: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(120), nullable=False
    )
    unit: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    cost_per_unit: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False
    )


# 5. CUSTOMERS TABLE
class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    name: Mapped[str] = mapped_column(
        String(120), nullable=False
    )
    customer_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    gstin: Mapped[str | None] = mapped_column(
        String(15), nullable=True
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )

class BOMItem(Base):
    __tablename__ = "bom_items"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False
    )

    raw_material_id: Mapped[int] = mapped_column(
        ForeignKey("raw_materials.id"),
        nullable=False
    )

    quantity_required: Mapped[float] = mapped_column(
        Numeric(12, 3),
        nullable=False
    )

    output_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

class StockMovement(Base):
    __tablename__ = "stock_movements"

    __table_args__ = (
        CheckConstraint(
            """
            (raw_material_id IS NOT NULL AND product_id IS NULL)
            OR
            (raw_material_id IS NULL AND product_id IS NOT NULL)
            """,
            name="check_stock_item"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    raw_material_id: Mapped[int | None] = mapped_column(
        ForeignKey("raw_materials.id"),
        nullable=True
    )

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"),
        nullable=True
    )

    movement_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    quantity_in: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        default=Decimal("0"),
        nullable=False
    )

    quantity_out: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        default=Decimal("0"),
        nullable=False
    )

    reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    order_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="PENDING"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"), nullable=False
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"), nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"), unique=True, nullable=False
    )

    taxable_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    cgst_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0")
    )

    sgst_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0")
    )

    igst_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0")
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="ISSUED"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Dispatch(Base):
    __tablename__ = "dispatches"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    dispatch_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"), nullable=False
    )

    quantity_dispatched: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="DISPATCHED"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

class Payment(Base):
    __tablename__ = "payments"

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_payment_amount_positive"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id"),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    reference_number: Mapped[str] = mapped_column(
        String(100),
        nullable=True
    )

    notes: Mapped[str] = mapped_column(
        String(255),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )

class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    expense_reference: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    expense_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        CheckConstraint("amount > 0"),
        nullable=False
    )

    notes: Mapped[str] = mapped_column(
        String(255),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )
    
    production_batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("production_batches.id"),
        nullable=True
    )

class ProductionBatch(Base):
    __tablename__ = "production_batches"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    batch_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False
    )

    planned_output: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    actual_good_output: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    damaged_pouches: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="DRAFT"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )


