import os   
MANUFACTURER_STATE = os.getenv(
    "MANUFACTURER_STATE",
    "Tamil Nadu"
)
from io import BytesIO
from xml.sax.saxutils import escape
from audit import write_audit_log
from fastapi.responses import StreamingResponse

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import Literal
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
    require_roles,
    hash_password
)

from database import get_db, Base, engine,SessionLocal
from models import (
    User,
    Product,
    RawMaterial,
    Customer,
    Role,
    BOMItem,
    StockMovement,
    SalesOrder,
    SalesOrderItem,
    Invoice,
    Dispatch,
    Payment,
    Expense,
    ProductionBatch,
    AuditLog
)
Base.metadata.create_all(bind=engine)
class MaterialCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    unit: str = Field(min_length=1, max_length=20)
    unit_cost: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class PurchaseCreate(BaseModel):
    sku: str
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    unit_cost: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    reference: str = Field(min_length=2, max_length=100)
    notes: str | None = Field(default=None, max_length=255)


class StockAdjustmentCreate(BaseModel):
    sku: str
    direction: Literal["IN", "OUT"]
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    reference: str = Field(min_length=2, max_length=100)
    notes: str | None = Field(default=None, max_length=255)
class SalesOrderCreate(BaseModel):
    order_number: str = Field(min_length=2, max_length=50)
    customer_id: int = Field(gt=0)
    product_sku: str = Field(min_length=2, max_length=50)
    quantity: int = Field(gt=0)
class PaymentCreate(BaseModel):
    invoice_number: str
    amount: Decimal = Field(gt=0)
    payment_method: str
    reference_number: str | None = None
    notes: str | None = None

class ProductionMaterialUsage(BaseModel):
    sku: str
    quantity: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=3
    )


class ProductionExpenseInput(BaseModel):
    reference: str = Field(min_length=2, max_length=100)
    expense_type: str = Field(min_length=2, max_length=50)
    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2
    )
    notes: str | None = Field(default=None, max_length=255)


class ProductionBatchCreate(BaseModel):
    batch_number: str = Field(min_length=2, max_length=50)
    product_sku: str
    planned_output: int = Field(gt=0)
    actual_good_output: int = Field(ge=0)
    damaged_pouches: int = Field(ge=0)

    materials: list[ProductionMaterialUsage]
    expenses: list[ProductionExpenseInput] = []

app = FastAPI(
    title="Order-to-Audit System",
    description="Backend API for our food manufacturing management system",
    version="1.0.0"
)
@app.on_event("startup")
def initialize_production_owner():
    import os

    owner_email = os.getenv("OWNER_EMAIL")
    owner_password = os.getenv("OWNER_PASSWORD")

    if not owner_email or not owner_password:
        print("OWNER_EMAIL or OWNER_PASSWORD is missing.")
        return

    db = SessionLocal()

    try:
        roles = [
            "Owner",
            "Admin",
            "Salesman",
            "Production Supervisor",
            "Accountant/Auditor",
        ]

        for role_name in roles:
            role = db.query(Role).filter(
                Role.name == role_name
            ).first()

            if not role:
                db.add(Role(name=role_name))

        db.commit()

        owner_role = db.query(Role).filter(
            Role.name == "Owner"
        ).first()

        owner = db.query(User).filter(
            User.email == owner_email
        ).first()

        if not owner:
            owner = User(
                full_name="Owner",
                email=owner_email,
                password_hash=hash_password(owner_password),
                role_id=owner_role.id,
                is_active=True,
            )

            db.add(owner)
            db.commit()

            print("Production Owner account created successfully.")
        else:
              owner.password_hash = hash_password(owner_password)
              owner.is_active = True
              db.commit()
              print("Production Owner password synchronized successfully.")

    except Exception as error:
        db.rollback()
        print("Owner initialization failed:", error)
        raise

    finally:
        db.close()
# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ordertoaudit-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role_id": current_user.role_id
    }

@app.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    # Find user by email
    user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    # Verify user credentials
    if not user or not verify_password(
        form_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Reject inactive accounts
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Generate JWT token
    access_token = create_access_token(user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role_id": user.role_id
        }
    }


@app.get("/")
def home():
    return {
        "message": "Order-to-Audit Backend is running!"
    }

@app.get("/db-check")

def db_check(db: Session = Depends(get_db)):
    try:
        db.execute(func.now().select())
        return {"database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed."
        )
# INVENTORY WRITE OPERATIONS

def get_material_stock(db: Session, material_id: int) -> Decimal:
    totals = db.query(
        func.coalesce(func.sum(StockMovement.quantity_in), 0),
        func.coalesce(func.sum(StockMovement.quantity_out), 0)
    ).filter(
        StockMovement.raw_material_id == material_id
    ).first()

    return Decimal(str(totals[0])) - Decimal(str(totals[1]))


def check_reference(db: Session, reference: str):
    existing = db.query(StockMovement).filter(
        StockMovement.reference == reference
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This transaction reference already exists."
        )


@app.post(
    "/inventory/materials",
    status_code=201,
    dependencies=[Depends(require_roles("Owner", "Admin"))]
)
def add_inventory_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sku = data.sku.strip().upper()

    existing = db.query(RawMaterial).filter(
        RawMaterial.sku == sku
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Material SKU already exists."
        )

    if db.query(Product).filter(Product.sku == sku).first():
        raise HTTPException(
            status_code=409,
            detail="This SKU already belongs to a finished product."
        )

    material = RawMaterial(
        sku=sku,
        name=data.name.strip(),
        unit=data.unit.strip(),
        cost_per_unit=data.unit_cost,
        unit_cost=data.unit_cost
    )

    try:
        db.add(material)
        db.flush()

        write_audit_log(
            db=db,
            actor=current_user,
            action="CREATE",
            module="Inventory",
            entity_type="RawMaterial",
            entity_id=material.id,
            description=f"Created inventory material: {material.name}",
            details={
                "sku": material.sku,
                "name": material.name,
                "unit": material.unit,
                "unit_cost": str(material.unit_cost)
            }
        )

        db.commit()
        db.refresh(material)

        return {
            "message": "Material created successfully.",
            "id": material.id,
            "sku": material.sku,
            "name": material.name,
            "unit": material.unit,
            "unit_cost": float(material.unit_cost),
            "current_stock": 0
        }

    except Exception:
        db.rollback()
        raise



@app.post(
    "/inventory/purchases",
    status_code=201,
    dependencies=[Depends(require_roles("Owner", "Admin"))]
)
def record_inventory_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.query(RawMaterial).filter(
        RawMaterial.sku == data.sku.strip().upper()
    ).with_for_update().first()

    if not material:
        raise HTTPException(
            status_code=404,
            detail="Raw material not found."
        )

    check_reference(db, data.reference.strip())

    current_stock = get_material_stock(db, material.id)
    new_stock = current_stock + data.quantity

    material.unit_cost = data.unit_cost
    material.cost_per_unit = data.unit_cost

    movement = StockMovement(
        raw_material_id=material.id,
        product_id=None,
        movement_type="PURCHASE",
        quantity_in=data.quantity,
        quantity_out=Decimal("0"),
        reference=data.reference.strip(),
        notes=data.notes
    )

    try:
        db.add(movement)
        db.flush()

        write_audit_log(
            db=db,
            actor=current_user,
            action="CREATE",
            module="Inventory",
            entity_type="StockMovement",
            entity_id=movement.id,
            description=f"Recorded purchase for {material.name}",
            details={
                "sku": material.sku,
                "material": material.name,
                "quantity": str(data.quantity),
                "unit_cost": str(data.unit_cost),
                "reference": data.reference.strip()
            }
        )

        db.commit()

        return {
            "message": "Purchase recorded successfully.",
            "reference": data.reference,
            "material": material.name,
            "quantity_purchased": float(data.quantity),
            "unit_cost": float(data.unit_cost),
            "current_stock": float(new_stock)
        }

    except Exception:
        db.rollback()
        raise

@app.post(
    "/inventory/adjustments",
    status_code=201,
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Production Supervisor"
    ))]
)
def adjust_inventory_stock(
    data: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.query(RawMaterial).filter(
        RawMaterial.sku == data.sku.strip().upper()
    ).with_for_update().first()

    if not material:
        raise HTTPException(
            status_code=404,
            detail="Raw material not found."
        )

    check_reference(db, data.reference.strip())

    current_stock = get_material_stock(db, material.id)

    if data.direction == "OUT" and data.quantity > current_stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available quantity: {current_stock} {material.unit}"
        )

    quantity_in = (
        data.quantity if data.direction == "IN"
        else Decimal("0")
    )

    quantity_out = (
        data.quantity if data.direction == "OUT"
        else Decimal("0")
    )

    movement = StockMovement(
        raw_material_id=material.id,
        product_id=None,
        movement_type="ADJUSTMENT",
        quantity_in=quantity_in,
        quantity_out=quantity_out,
        reference=data.reference.strip(),
        notes=data.notes
    )

    new_stock = (
        current_stock + quantity_in - quantity_out
    )

    try:
        db.add(movement)
        db.flush()

        write_audit_log(
            db=db,
            actor=current_user,
            action="ADJUST",
            module="Inventory",
            entity_type="StockMovement",
            entity_id=movement.id,
            description=f"Stock adjusted for {material.name}",
            details={
                "sku": material.sku,
                "material": material.name,
                "direction": data.direction,
                "quantity": str(data.quantity),
                "previous_stock": str(current_stock),
                "new_stock": str(new_stock),
                "reference": data.reference.strip()
            }
        )

        db.commit()

        return {
            "message": "Stock adjustment recorded successfully.",
            "reference": data.reference,
            "material": material.name,
            "direction": data.direction,
            "quantity": float(data.quantity),
            "current_stock": float(new_stock)
        }

    except Exception:
        db.rollback()
        raise

# 1. CURRENT STOCK
@app.get(
    "/inventory/stock",
    dependencies=[Depends(require_roles(
        "Owner",
        "Admin",
        "Production Supervisor",
        "Accountant/Auditor"
    ))]
)
def get_inventory_stock(db: Session = Depends(get_db)):

    materials = db.query(RawMaterial).order_by(
        RawMaterial.id
    ).all()

    products = db.query(Product).filter(
        Product.is_active == True
    ).order_by(Product.id).all()

    items = []

    for material in materials:
        stock = get_material_stock(db, material.id)

        items.append({
            "sku": material.sku,
            "name": material.name,
            "category": (
                "Packaging"
                if material.sku.startswith("PKG-")
                else "Raw Material"
            ),
            "quantity": float(stock),
            "unit": material.unit,
            "unit_cost": float(material.unit_cost or 0),
            "minimum_stock": float(material.minimum_stock)
        })

    for product in products:
        totals = db.query(
            func.coalesce(func.sum(StockMovement.quantity_in), 0),
            func.coalesce(func.sum(StockMovement.quantity_out), 0)
        ).filter(
            StockMovement.product_id == product.id
        ).first()

        stock = totals[0] - totals[1]

        items.append({
            "sku": product.sku,
            "name": product.name,
            "category": "Finished Goods",
            "quantity": float(stock),
            "unit": product.unit,
            "unit_cost": 0,
            "minimum_stock": 0
        })

    return {
        "total_items": len(items),
        "items": items
    }

@app.get(
    "/inventory/low-stock",
    dependencies=[Depends(require_roles(
        "Owner",
        "Admin",
        "Production Supervisor",
        "Accountant/Auditor"
    ))]
)
def get_low_stock_alerts(db: Session = Depends(get_db)):

    alerts = []

    raw_materials = db.query(RawMaterial).order_by(
        RawMaterial.id
    ).all()

    for material in raw_materials:

        movement = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            ),
            func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.raw_material_id == material.id
        ).first()

        available_stock = movement[0] - movement[1]
        minimum_stock = material.minimum_stock

        if available_stock <= minimum_stock:

            alerts.append({
                "sku": material.sku,
                "name": material.name,
                "available_quantity": float(available_stock),
                "minimum_stock": float(minimum_stock),
                "unit": material.unit,
                "status": (
                    "OUT_OF_STOCK"
                    if available_stock <= 0
                    else "LOW_STOCK"
                )
            })

    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }

# 2. STOCK MOVEMENT LEDGER
@app.get(
    "/inventory/movements",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Production Supervisor", "Accountant/Auditor"
    ))]
)
def get_inventory_movements(
    db: Session = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500)
):

    records = (
        db.query(
            StockMovement,
            RawMaterial.name,
            RawMaterial.unit,
            Product.name,
            Product.unit
        )
        .outerjoin(
            RawMaterial,
            StockMovement.raw_material_id == RawMaterial.id
        )
        .outerjoin(
            Product,
            StockMovement.product_id == Product.id
        )
        .order_by(
            StockMovement.created_at.desc(),
            StockMovement.id.desc()
        )
        .limit(limit)
        .all()
    )

    movements = []

    for record, raw_name, raw_unit, product_name, product_unit in records:

        item_name = raw_name or product_name
        item_unit = raw_unit or product_unit

        if record.quantity_in > 0:
            direction = "IN"
            quantity = record.quantity_in
        else:
            direction = "OUT"
            quantity = record.quantity_out

        movements.append({
            "reference": record.reference,
            "item": item_name,
            "type": record.movement_type.replace("_", " ").title(),
            "direction": direction,
            "quantity": f"{quantity} {item_unit}",
            "created_at": (
                record.created_at.isoformat()
                if record.created_at else None
            )
        })

    return {
        "total_movements": len(movements),
        "movements": movements
    }


# 3. INVENTORY SUMMARY
@app.get(
    "/inventory/summary",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Production Supervisor", "Accountant/Auditor"
    ))]
)
def get_inventory_summary(db: Session = Depends(get_db)):

    materials = db.query(RawMaterial).all()

    products = db.query(Product).filter(
        Product.is_active == True
    ).all()

    raw_count = sum(
        1 for item in materials
        if not item.sku.startswith("PKG-")
    )

    packaging_count = sum(
        1 for item in materials
        if item.sku.startswith("PKG-")
    )

    finished_quantity = 0

    for product in products:

        totals = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            ),
            func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.product_id == product.id
        ).first()

        finished_quantity += totals[0] - totals[1]

    return {
        "tracked_items": len(materials) + len(products),
        "raw_materials": raw_count,
        "packaging_items": packaging_count,
        "finished_goods_quantity": float(finished_quantity)
    }




@app.get(
    "/production/batches",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Production Supervisor", "Accountant/Auditor"
    ))]
)
def get_production_batches(db: Session = Depends(get_db)):

    batches = (
        db.query(ProductionBatch)
        .order_by(ProductionBatch.created_at.desc())
        .all()
    )

    results = []

    for batch in batches:

        product = db.query(Product).filter(
            Product.id == batch.product_id
        ).first()

        planned = batch.planned_output or 0
        actual = batch.actual_good_output or 0

        yield_variance = (
            ((actual - planned) / planned) * 100
            if planned > 0 else 0
        )

        bom_items = db.query(BOMItem).filter(
            BOMItem.product_id == batch.product_id
        ).all()

        materials = []

        for bom in bom_items:

            material = db.query(RawMaterial).filter(
                RawMaterial.id == bom.raw_material_id
            ).first()

            if not material:
                continue

            standard = (
                Decimal(str(bom.quantity_required))
                * Decimal(str(actual))
                / Decimal(str(bom.output_quantity))
                if bom.output_quantity else Decimal("0")
            )

            actual_usage = db.query(
                func.coalesce(
                    func.sum(StockMovement.quantity_out), 0
                )
            ).filter(
                StockMovement.reference == batch.batch_number,
                StockMovement.raw_material_id == material.id
            ).scalar()

            actual_usage = Decimal(str(actual_usage))
            standard = Decimal(str(standard))

            variance = actual_usage - standard

            variance_percent = (
                (variance / standard) * 100
                if standard > 0 else 0
            )

            materials.append({
                "material": material.name,
                "unit": material.unit,
                "standard_usage": float(standard),
                "actual_usage": float(actual_usage),
                "variance": float(variance),
                "variance_percent": float(variance_percent)
            })

        expenses = db.query(
            func.coalesce(func.sum(Expense.amount), 0)
        ).filter(
            Expense.production_batch_id == batch.id
        ).scalar()

        results.append({
            "batch_number": batch.batch_number,
            "product": product.name if product else "Unknown",
            "planned_output": planned,
            "actual_good_output": actual,
            "damaged_pouches": batch.damaged_pouches,
            "yield_variance_percent": round(yield_variance, 2),
            "status": batch.status,
            "expenses": float(expenses),
            "materials": materials,
            "created_at": (
                batch.created_at.isoformat()
                if batch.created_at else None
            )
        })

    return {
        "total_batches": len(results),
        "batches": results
    }

@app.post(
    "/production/batches",
    status_code=201,
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Production Supervisor"
    ))]
)
def record_production_batch(
    data: ProductionBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch_number = data.batch_number.strip().upper()
    product_sku = data.product_sku.strip().upper()

    # 1. Prevent duplicate batch numbers
    existing_batch = db.query(ProductionBatch).filter(
        ProductionBatch.batch_number == batch_number
    ).first()

    if existing_batch:
        raise HTTPException(
            status_code=409,
            detail="Production batch number already exists."
        )

    # 2. Find product
    product = db.query(Product).filter(
        Product.sku == product_sku,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found."
        )

    # 3. Get product BOM
    bom_items = db.query(BOMItem).filter(
        BOMItem.product_id == product.id
    ).all()

    if not bom_items:
        raise HTTPException(
            status_code=400,
            detail="No Bill of Materials found for this product."
        )

    # 4. Validate material entries
    submitted_skus = [
        item.sku.strip().upper()
        for item in data.materials
    ]

    if len(submitted_skus) != len(set(submitted_skus)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate material SKU entries are not allowed."
        )

    bom_material_ids = {
        item.raw_material_id for item in bom_items
    }

    usage_records = []

    for usage in data.materials:

        material = db.query(RawMaterial).filter(
            RawMaterial.sku == usage.sku.strip().upper()
        ).with_for_update().first()

        if not material:
            raise HTTPException(
                status_code=404,
                detail=f"Material {usage.sku} not found."
            )

        if material.id not in bom_material_ids:
            raise HTTPException(
                status_code=400,
                detail=f"{material.name} is not part of this product's BOM."
            )

        current_stock = get_material_stock(db, material.id)

        if usage.quantity > current_stock:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for {material.name}. "
                    f"Available: {current_stock} {material.unit}"
                )
            )

        usage_records.append({
            "material": material,
            "quantity": usage.quantity
        })

    if {item["material"].id for item in usage_records} != bom_material_ids:
        raise HTTPException(
            status_code=400,
            detail="Actual usage must be provided for every BOM material."
        )

    # 5. Check expense references
    expense_references = [
        expense.reference.strip()
        for expense in data.expenses
    ]

    if len(expense_references) != len(set(expense_references)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate expense references are not allowed."
        )

    for reference in expense_references:
        existing_expense = db.query(Expense).filter(
            Expense.expense_reference == reference
        ).first()

        if existing_expense:
            raise HTTPException(
                status_code=409,
                detail=f"Expense reference {reference} already exists."
            )

    try:
        # 6. Create production batch
        batch = ProductionBatch(
            batch_number=batch_number,
            product_id=product.id,
            planned_output=data.planned_output,
            actual_good_output=data.actual_good_output,
            damaged_pouches=data.damaged_pouches,
            status="COMPLETED"
        )

        db.add(batch)
        db.flush()

        # 7. Deduct consumed materials from inventory
        for record in usage_records:

            movement = StockMovement(
                raw_material_id=record["material"].id,
                product_id=None,
                movement_type="PRODUCTION_CONSUMPTION",
                quantity_in=Decimal("0"),
                quantity_out=record["quantity"],
                reference=batch_number,
                notes=f"Material consumed for {batch_number}"
            )

            db.add(movement)

        # 8. Add finished goods to inventory
        if data.actual_good_output > 0:
            finished_movement = StockMovement(
                raw_material_id=None,
                product_id=product.id,
                movement_type="PRODUCTION_OUTPUT",
                quantity_in=Decimal(data.actual_good_output),
                quantity_out=Decimal("0"),
                reference=batch_number,
                notes=f"Finished goods produced in {batch_number}"
            )

            db.add(finished_movement)

        # 9. Record production expenses
        for expense_data in data.expenses:

            expense = Expense(
                expense_reference=expense_data.reference.strip(),
                expense_type=expense_data.expense_type.strip(),
                amount=expense_data.amount,
                notes=expense_data.notes,
                production_batch_id=batch.id
            )

            db.add(expense)

        # 10. Record audit event
        write_audit_log(
            db=db,
            actor=current_user,
            action="CREATE",
            module="Production",
            entity_type="ProductionBatch",
            entity_id=batch.id,
            description=f"Recorded production batch: {batch_number}",
            details={
                "batch_number": batch_number,
                "product": product.name,
                "product_sku": product.sku,
                "planned_output": data.planned_output,
                "actual_good_output": data.actual_good_output,
                "damaged_pouches": data.damaged_pouches,
                "materials_consumed": [
                    {
                        "sku": record["material"].sku,
                        "name": record["material"].name,
                        "quantity": str(record["quantity"])
                    }
                    for record in usage_records
                ],
                "expenses_recorded": len(data.expenses)
            }
        )

        # 11. Save everything together
        db.commit()

        return {
            "message": "Production batch recorded successfully.",
            "batch_number": batch_number,
            "product": product.name,
            "planned_output": data.planned_output,
            "actual_good_output": data.actual_good_output,
            "damaged_pouches": data.damaged_pouches,
            "status": batch.status,
            "materials_consumed": len(usage_records),
            "expenses_recorded": len(data.expenses)
        }

    except Exception:
        db.rollback()
        raise

@app.get(
    "/sales/order-options",
    dependencies=[Depends(require_roles("Owner", "Admin", "Salesman"))]
)
def get_sales_order_options(db: Session = Depends(get_db)):
    customers = db.query(Customer).order_by(Customer.name.asc()).all()
    products = db.query(Product).filter(
        Product.is_active == True
    ).order_by(Product.name.asc()).all()

    return {
        "customers": [
            {
                "id": customer.id,
                "name": customer.name,
                "customer_type": customer.customer_type,
                "state": customer.state
            }
            for customer in customers
        ],
        "products": [
            {
                "id": product.id,
                "sku": product.sku,
                "name": product.name,
                "unit": product.unit,
                "selling_price": str(product.selling_price)
            }
            for product in products
        ]
    }



@app.post(
    "/sales/orders",
    status_code=201,
    dependencies=[Depends(require_roles("Owner", "Admin", "Salesman"))]
)
def create_sales_order(
    data: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order_number = data.order_number.strip().upper()
    product_sku = data.product_sku.strip().upper()

    existing_order = db.query(SalesOrder).filter(
        SalesOrder.order_number == order_number
    ).first()
    if existing_order:
        raise HTTPException(
            status_code=409,
            detail="Sales order number already exists."
        )

    customer = db.query(Customer).filter(
        Customer.id == data.customer_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    product = db.query(Product).filter(
        Product.sku == product_sku,
        Product.is_active == True
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Active product not found.")

    stock_totals = db.query(
        func.coalesce(func.sum(StockMovement.quantity_in), 0),
        func.coalesce(func.sum(StockMovement.quantity_out), 0)
    ).filter(
        StockMovement.product_id == product.id
    ).first()
    available_quantity = int(stock_totals[0] - stock_totals[1])
    shortage = max(0, data.quantity - available_quantity)

    order = SalesOrder(
        order_number=order_number,
        customer_id=customer.id,
        status="PENDING"
    )

    try:
        db.add(order)
        db.flush()

        order_item = SalesOrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=data.quantity,
            unit_price=product.selling_price
        )
        db.add(order_item)

        write_audit_log(
            db=db,
            actor=current_user,
            action="CREATE",
            module="Sales",
            entity_type="SalesOrder",
            entity_id=order.id,
            description=f"Created sales order: {order_number}",
            details={
                "order_number": order_number,
                "customer": customer.name,
                "product": product.name,
                "product_sku": product.sku,
                "quantity": data.quantity,
                "available_quantity": available_quantity,
                "shortage": shortage,
                "unit_price": str(product.selling_price)
            }
        )

        db.commit()

        return {
            "message": "Sales order created successfully.",
            "order_number": order_number,
            "customer": customer.name,
            "product": product.name,
            "quantity": data.quantity,
            "available_quantity": available_quantity,
            "shortage": shortage,
            "unit_price": str(product.selling_price),
            "status": order.status
        }
    except Exception:
        db.rollback()
        raise

@app.get(
    "/sales/orders",
    dependencies=[Depends(require_roles("Owner", "Admin", "Salesman"))]
)
def get_sales_orders(db: Session = Depends(get_db)):
    orders = db.query(SalesOrder).order_by(
        SalesOrder.id.desc()
    ).all()

    result = []
    for order in orders:
        customer = db.query(Customer).filter(
            Customer.id == order.customer_id
        ).first()
        order_items = db.query(SalesOrderItem).filter(
            SalesOrderItem.order_id == order.id
        ).all()

        if not order_items:
            continue

        item = order_items[0]
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()
        if not product:
            continue

        total_quantity = sum(order_item.quantity for order_item in order_items)
        stock_totals = db.query(
            func.coalesce(func.sum(StockMovement.quantity_in), 0),
            func.coalesce(func.sum(StockMovement.quantity_out), 0)
        ).filter(
            StockMovement.product_id == product.id
        ).first()
        current_stock = int(stock_totals[0] - stock_totals[1])

        dispatched_quantity = db.query(
            func.coalesce(func.sum(Dispatch.quantity_dispatched), 0)
        ).filter(
            Dispatch.order_id == order.id
        ).scalar()
        dispatched_quantity = int(dispatched_quantity or 0)

        # Reconstruct stock available when this order was placed/dispatched.
        available_quantity = current_stock + dispatched_quantity
        shortage = max(0, total_quantity - available_quantity)

        result.append({
            "order_number": order.order_number,
            "customer": customer.name if customer else "Unknown",
            "product": product.name,
            "quantity": total_quantity,
            "available_quantity": available_quantity,
            "dispatched_quantity": dispatched_quantity,
            "shortage": shortage,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None
        })

    return {"total_orders": len(result), "orders": result}

from decimal import Decimal, ROUND_HALF_UP


@app.post(
    "/sales/orders/{order_number}/approve",
    status_code=201,
    dependencies=[Depends(require_roles("Owner", "Admin"))]
)
def approve_sales_order(
    order_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order_number = order_number.strip().upper()

    try:
        # 1. Find and lock the sales order
        order = db.query(SalesOrder).filter(
            SalesOrder.order_number == order_number
        ).with_for_update().first()

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Sales order not found."
            )

        if order.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING orders can be approved. Current status: {order.status}"
            )

        # 2. Prevent duplicate invoices
        existing_invoice = db.query(Invoice).filter(
            Invoice.order_id == order.id
        ).first()

        if existing_invoice:
            raise HTTPException(
                status_code=409,
                detail="An invoice already exists for this order."
            )

        # 3. Find customer
        customer = db.query(Customer).filter(
            Customer.id == order.customer_id
        ).first()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found."
            )

        # 4. Get order items
        order_items = db.query(SalesOrderItem).filter(
            SalesOrderItem.order_id == order.id
        ).all()

        if not order_items:
            raise HTTPException(
                status_code=400,
                detail="Sales order has no items."
            )

        # 5. Calculate current available stock and
        #    account for quantities reserved by other approved orders.
        taxable_amount = Decimal("0.00")
        cgst_amount = Decimal("0.00")
        sgst_amount = Decimal("0.00")
        igst_amount = Decimal("0.00")

        invoice_lines = []

        for item in order_items:

            product = db.query(Product).filter(
                Product.id == item.product_id,
                Product.is_active == True
            ).with_for_update().first()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail="An active product in this order was not found."
                )

            stock_totals = db.query(
                func.coalesce(
                    func.sum(StockMovement.quantity_in), 0
                ),
                func.coalesce(
                    func.sum(StockMovement.quantity_out), 0
                )
            ).filter(
                StockMovement.product_id == product.id
            ).first()

            current_stock = int(
                stock_totals[0] - stock_totals[1]
            )

            # Other APPROVED orders reserve stock until dispatched.
            approved_orders = db.query(
                SalesOrder.id,
                func.sum(SalesOrderItem.quantity)
            ).join(
                SalesOrderItem,
                SalesOrderItem.order_id == SalesOrder.id
            ).filter(
                SalesOrder.status == "APPROVED",
                SalesOrderItem.product_id == product.id,
                SalesOrder.id != order.id
            ).group_by(
                SalesOrder.id
            ).all()

            reserved_quantity = 0

            for approved_order_id, approved_quantity in approved_orders:

                already_dispatched = db.query(
                    func.coalesce(
                        func.sum(Dispatch.quantity_dispatched), 0
                    )
                ).filter(
                    Dispatch.order_id == approved_order_id
                ).scalar()

                remaining = max(
                    0,
                    int(approved_quantity) - int(already_dispatched or 0)
                )

                reserved_quantity += remaining

            available_quantity = current_stock - reserved_quantity

            if item.quantity > available_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient available stock for {product.name}. "
                        f"Available: {available_quantity}, "
                        f"Required: {item.quantity}"
                    )
                )

            # 6. Calculate taxable value
            line_taxable = (
                Decimal(str(item.unit_price))
                * Decimal(item.quantity)
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            gst_rate = Decimal(str(product.gst_rate))
            line_gst = (
                line_taxable * gst_rate / Decimal("100")
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            # 7. Determine intra-state or inter-state GST
            same_state = (
                customer.state.strip().casefold()
                == MANUFACTURER_STATE.strip().casefold()
            )

            taxable_amount += line_taxable

            if same_state:
                half_gst = (
                    line_gst / Decimal("2")
                ).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP
                )

                cgst_amount += half_gst
                sgst_amount += line_gst - half_gst

            else:
                igst_amount += line_gst

            invoice_lines.append({
                "product": product.name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "taxable_amount": str(line_taxable),
                "gst_rate": str(gst_rate)
            })

        # 8. Calculate invoice total
        total_amount = (
            taxable_amount
            + cgst_amount
            + sgst_amount
            + igst_amount
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        # 9. Create invoice
        invoice = Invoice(
            invoice_number=f"INV-SO-{order.id:06d}",
            order_id=order.id,
            taxable_amount=taxable_amount,
            cgst_amount=cgst_amount,
            sgst_amount=sgst_amount,
            igst_amount=igst_amount,
            total_amount=total_amount,
            status="ISSUED"
        )

        db.add(invoice)

        # 10. Update order status
        order.status = "APPROVED"
        db.flush()
        write_audit_log(
            db=db,
            actor=current_user,
            action="APPROVE",
            module="Sales",
            entity_type="Invoice",
            entity_id=invoice.id,
            description=f"Approved sales order and generated invoice: {invoice.invoice_number}",
            details={
                "order_number": order.order_number,
                "invoice_number": invoice.invoice_number,
                "customer": customer.name,
                "taxable_amount": str(taxable_amount),
                "cgst_amount": str(cgst_amount),
                "sgst_amount": str(sgst_amount),
                "igst_amount": str(igst_amount),
                "total_amount": str(total_amount),
                "invoice_status": invoice.status
    }
)
        # 11. Save invoice and order together
        db.commit()
        db.refresh(invoice)

        return {
            "message": "Sales order approved and GST invoice generated successfully.",
            "order_number": order.order_number,
            "order_status": order.status,
            "invoice_number": invoice.invoice_number,
            "customer": customer.name,
            "manufacturer_state_assumption": MANUFACTURER_STATE,
            "customer_state": customer.state,
            "taxable_amount": str(taxable_amount),
            "cgst_amount": str(cgst_amount),
            "sgst_amount": str(sgst_amount),
            "igst_amount": str(igst_amount),
            "total_amount": str(total_amount),
            "invoice_status": invoice.status,
            "items": invoice_lines
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

@app.get(
    "/sales/invoices",
    dependencies=[Depends(require_roles(
        "Owner",
        "Admin",
        "Accountant/Auditor"
    ))]
)
def get_sales_invoices(db: Session = Depends(get_db)):

    invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.asc())
        .all()
    )

    result = []

    for invoice in invoices:

        # Find the related sales order
        order = db.query(SalesOrder).filter(
            SalesOrder.id == invoice.order_id
        ).first()

        if not order:
            continue

        # Find customer
        customer = db.query(Customer).filter(
            Customer.id == order.customer_id
        ).first()

        # Calculate total payments received
        paid_amount = db.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.invoice_id == invoice.id
        ).scalar()

        paid_amount = Decimal(str(paid_amount))
        total_amount = Decimal(str(invoice.total_amount))

        outstanding_amount = max(
            Decimal("0.00"),
            total_amount - paid_amount
        )

        # Determine payment status
        if paid_amount >= total_amount:
            payment_status = "PAID"
        elif paid_amount > 0:
            payment_status = "PARTIALLY_PAID"
        else:
            payment_status = "UNPAID"

        result.append({
            "invoice_number": invoice.invoice_number,
            "order_number": order.order_number,
            "customer": customer.name if customer else "Unknown",

            "taxable_amount": float(invoice.taxable_amount),
            "cgst_amount": float(invoice.cgst_amount),
            "sgst_amount": float(invoice.sgst_amount),
            "igst_amount": float(invoice.igst_amount),

            "total_amount": float(invoice.total_amount),
            "paid_amount": float(paid_amount),
            "outstanding_amount": float(outstanding_amount),

            "invoice_status": invoice.status,
            "payment_status": payment_status,

            "created_at": (
                invoice.created_at.isoformat()
                if invoice.created_at else None
            )
        })

    return {
        "total_invoices": len(result),
        "invoices": result
    }

@app.get(
    "/sales/invoices/{invoice_number}/pdf",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Accountant/Auditor"
    ))]
)
def download_invoice_pdf(
    invoice_number: str,
    db: Session = Depends(get_db)
):
    # 1. Find invoice
    invoice = db.query(Invoice).filter(
        Invoice.invoice_number == invoice_number.strip().upper()
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found."
        )

    # 2. Find related order
    order = db.query(SalesOrder).filter(
        SalesOrder.id == invoice.order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Related sales order not found."
        )

    # 3. Find customer
    customer = db.query(Customer).filter(
        Customer.id == order.customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    # 4. Find order items
    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.order_id == order.id
    ).all()

    if not items:
        raise HTTPException(
            status_code=400,
            detail="No invoice items found."
        )

    # 5. Calculate payment details
    paid_amount = db.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(
        Payment.invoice_id == invoice.id
    ).scalar()

    paid_amount = Decimal(str(paid_amount))

    outstanding_amount = max(
        Decimal("0.00"),
        Decimal(str(invoice.total_amount)) - paid_amount
    )

    # 6. Create PDF in memory
    pdf_buffer = BytesIO()

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm
    )

    styles = getSampleStyleSheet()
    content = []

    # 7. Invoice heading
    content.append(
        Paragraph("GST TAX INVOICE", styles["Title"])
    )

    content.append(Spacer(1, 15))

    # 8. Invoice information
    invoice_info = [
        ["Invoice Number", escape(invoice.invoice_number)],
        ["Order Number", escape(order.order_number)],
        [
            "Invoice Date",
            invoice.created_at.strftime("%d-%m-%Y")
            if invoice.created_at else "N/A"
        ],
        ["Invoice Status", escape(invoice.status)]
    ]

    info_table = Table(
        invoice_info,
        colWidths=[120, 350]
    )

    info_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
    ]))

    content.append(info_table)
    content.append(Spacer(1, 18))

    # 9. Customer information
    content.append(
        Paragraph("<b>Bill To</b>", styles["Heading2"])
    )

    content.append(
        Paragraph(
            f"Customer: {escape(customer.name)}",
            styles["Normal"]
        )
    )

    content.append(
        Paragraph(
            f"State: {escape(customer.state)}",
            styles["Normal"]
        )
    )

    content.append(
        Paragraph(
            f"GSTIN: {escape(customer.gstin or 'Not provided')}",
            styles["Normal"]
        )
    )

    content.append(Spacer(1, 20))

    # 10. Product table
    table_data = [[
        "Product",
        "Quantity",
        "Unit Price",
        "Amount"
    ]]

    for item in items:
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()

        product_name = (
            escape(product.name) if product else "Unknown Product"
        )

        amount = (
            Decimal(str(item.unit_price))
            * Decimal(item.quantity)
        )

        table_data.append([
            product_name,
            str(item.quantity),
            f"Rs. {Decimal(str(item.unit_price)):.2f}",
            f"Rs. {amount:.2f}"
        ])

    # 11. GST summary
    table_data.extend([
        ["", "", "Taxable Amount",
         f"Rs. {invoice.taxable_amount:.2f}"],

        ["", "", "CGST",
         f"Rs. {invoice.cgst_amount:.2f}"],

        ["", "", "SGST",
         f"Rs. {invoice.sgst_amount:.2f}"],

        ["", "", "IGST",
         f"Rs. {invoice.igst_amount:.2f}"],

        ["", "", "Grand Total",
         f"Rs. {invoice.total_amount:.2f}"],

        ["", "", "Paid Amount",
         f"Rs. {paid_amount:.2f}"],

        ["", "", "Outstanding",
         f"Rs. {outstanding_amount:.2f}"]
    ])

    invoice_table = Table(
        table_data,
        colWidths=[180, 65, 105, 130]
    )

    invoice_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (2, -3), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -3), (-1, -3), colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
    ]))

    content.append(invoice_table)

    content.append(Spacer(1, 25))

    content.append(
        Paragraph(
            "<b>Thank you for your business!</b>",
            styles["Normal"]
        )
    )

    content.append(Spacer(1, 10))

    content.append(
        Paragraph(
            "This invoice was generated by the Order-to-Audit System.",
            styles["Italic"]
        )
    )

    # 12. Generate PDF
    document.build(content)

    pdf_buffer.seek(0)

    # 13. Return downloadable PDF
    filename = f"{invoice.invoice_number}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        }
    )

@app.get(
    "/accounts/overview",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Accountant/Auditor"
    ))]
)
def get_accounts_overview(db: Session = Depends(get_db)):

    # 1. Fetch all payments
    payments = (
        db.query(Payment)
        .order_by(Payment.id.asc())
        .all()
    )

    payment_records = []

    for payment in payments:

        invoice = db.query(Invoice).filter(
            Invoice.id == payment.invoice_id
        ).first()

        order = None
        customer = None

        if invoice:
            order = db.query(SalesOrder).filter(
                SalesOrder.id == invoice.order_id
            ).first()

        if order:
            customer = db.query(Customer).filter(
                Customer.id == order.customer_id
            ).first()

        payment_records.append({
            "id": payment.id,
            "reference": payment.reference_number or f"PAY-{payment.id}",
            "customer": customer.name if customer else "Unknown",
            "invoice_number": invoice.invoice_number if invoice else "Unknown",
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "created_at": (
                payment.created_at.isoformat()
                if payment.created_at else None
            )
        })

    # 2. Fetch all expenses
    expenses = (
        db.query(Expense)
        .order_by(Expense.id.asc())
        .all()
    )

    expense_records = []

    for expense in expenses:
        expense_records.append({
            "id": expense.id,
            "reference": expense.expense_reference,
            "expense_type": expense.expense_type,
            "notes": expense.notes,
            "amount": float(expense.amount),
            "created_at": (
                expense.created_at.isoformat()
                if expense.created_at else None
            )
        })

    # 3. Calculate total payments
    total_payments = sum(
        (Decimal(str(p.amount)) for p in payments),
        Decimal("0.00")
    )

    # 4. Calculate outstanding invoice balances
    invoices = db.query(Invoice).all()

    total_outstanding = Decimal("0.00")

    for invoice in invoices:
        paid = db.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.invoice_id == invoice.id
        ).scalar()

        balance = (
            Decimal(str(invoice.total_amount))
            - Decimal(str(paid))
        )

        total_outstanding += max(
            Decimal("0.00"), balance
        )

    # 5. Calculate production expenses
    production_expenses = db.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.production_batch_id.isnot(None)
    ).scalar()

    production_expenses = Decimal(str(production_expenses))

    return {
        "summary": {
            "total_payments": float(total_payments),
            "total_outstanding": float(total_outstanding),
            "production_expenses": float(production_expenses),
            "total_transactions": len(payments) + len(expenses)
        },
        "payments": payment_records,
        "expenses": expense_records
    }
@app.post(
    "/accounts/payments",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Accountant/Auditor"
    ))]
)
def record_customer_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Find and lock invoice
        invoice = (
            db.query(Invoice)
            .filter(
                Invoice.invoice_number == data.invoice_number
            )
            .with_for_update()
            .first()
        )

        if not invoice:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        # 2. Calculate existing payments
        already_paid = db.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.invoice_id == invoice.id
        ).scalar()

        already_paid = Decimal(str(already_paid))
        invoice_total = Decimal(str(invoice.total_amount))
        outstanding = invoice_total - already_paid

        if outstanding <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invoice is already fully paid"
            )

        # 3. Prevent overpayment
        if data.amount > outstanding:
            raise HTTPException(
                status_code=400,
                detail=f"Payment exceeds outstanding balance of {outstanding}"
            )

        # 4. Prevent duplicate payment references
        if data.reference_number:
            existing_reference = db.query(Payment).filter(
                Payment.reference_number == data.reference_number
            ).first()

            if existing_reference:
                raise HTTPException(
                    status_code=400,
                    detail="Payment reference already exists"
                )

        # 5. Record payment
        payment = Payment(
            invoice_id=invoice.id,
            amount=data.amount,
            payment_method=data.payment_method,
            reference_number=data.reference_number,
            notes=data.notes
        )

        db.add(payment)
        db.flush()

        # 6. Record audit log
        write_audit_log(
            db=db,
            actor=current_user,
            action="CREATE",
            module="Accounts",
            entity_type="Payment",
            entity_id=payment.id,
            description=f"Recorded payment for invoice: {invoice.invoice_number}",
            details={
                "invoice_number": invoice.invoice_number,
                "amount": str(data.amount),
                "payment_method": data.payment_method,
                "reference_number": data.reference_number
            }
        )

        # 7. Calculate updated balance
        new_paid = already_paid + data.amount
        new_outstanding = invoice_total - new_paid

        # 8. Commit
        db.commit()
        db.refresh(payment)

        return {
            "message": "Payment recorded successfully.",
            "payment_id": payment.id,
            "invoice_number": invoice.invoice_number,
            "payment_amount": str(data.amount),
            "total_paid": str(new_paid),
            "outstanding_amount": str(new_outstanding),
            "payment_status": (
                "PAID" if new_outstanding == 0
                else "PARTIALLY_PAID"
            )
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise
@app.get(
    "/reports/business/pdf",
    dependencies=[Depends(require_roles(
        "Owner", "Admin", "Accountant/Auditor"
    ))]
)
def download_business_report_pdf(db: Session = Depends(get_db)):

    pdf_buffer = BytesIO()

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm
    )

    styles = getSampleStyleSheet()
    content = []

    def make_table(rows, widths):
        table = Table(rows, colWidths=widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
        ]))
        return table

    def money(value):
        return f"Rs. {Decimal(str(value or 0)):.2f}"

    # REPORT TITLE
    content.append(
        Paragraph("BUSINESS PERFORMANCE REPORT", styles["Title"])
    )
    content.append(
        Paragraph(
            "Order-to-Audit Manufacturing Management System",
            styles["Normal"]
        )
    )
    content.append(
        Paragraph(
            f"Generated: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}",
            styles["Normal"]
        )
    )
    content.append(Spacer(1, 15))

    # 1. INVENTORY REPORT
    content.append(
        Paragraph("1. Inventory Report", styles["Heading2"])
    )

    inventory_rows = [[
        "SKU", "Item", "Category", "Stock", "Unit"
    ]]

    materials = db.query(RawMaterial).order_by(RawMaterial.id).all()
    products = db.query(Product).filter(
        Product.is_active == True
    ).order_by(Product.id).all()

    for material in materials:
        totals = db.query(
            func.coalesce(func.sum(StockMovement.quantity_in), 0),
            func.coalesce(func.sum(StockMovement.quantity_out), 0)
        ).filter(
            StockMovement.raw_material_id == material.id
        ).first()

        stock = Decimal(str(totals[0])) - Decimal(str(totals[1]))

        category = (
            "Packaging"
            if material.sku.startswith("PKG-")
            else "Raw Material"
        )

        inventory_rows.append([
            material.sku,
            material.name,
            category,
            f"{stock:.3f}",
            material.unit
        ])

    for product in products:
        totals = db.query(
            func.coalesce(func.sum(StockMovement.quantity_in), 0),
            func.coalesce(func.sum(StockMovement.quantity_out), 0)
        ).filter(
            StockMovement.product_id == product.id
        ).first()

        stock = Decimal(str(totals[0])) - Decimal(str(totals[1]))

        inventory_rows.append([
            product.sku,
            product.name,
            "Finished Goods",
            f"{stock:.3f}",
            product.unit
        ])

    content.append(make_table(
        inventory_rows,
        [65, 115, 90, 65, 55]
    ))
    content.append(Spacer(1, 15))

    # 2. PRODUCTION PERFORMANCE
    content.append(
        Paragraph("2. Production Performance", styles["Heading2"])
    )

    batches = db.query(ProductionBatch).order_by(
        ProductionBatch.created_at.desc()
    ).all()

    total_planned = sum(
        batch.planned_output or 0 for batch in batches
    )
    total_actual = sum(
        batch.actual_good_output or 0 for batch in batches
    )

    overall_yield = (
        ((total_actual - total_planned) / total_planned) * 100
        if total_planned > 0 else 0
    )

    content.append(Paragraph(
        f"Total Planned Output: {total_planned} packets",
        styles["Normal"]
    ))
    content.append(Paragraph(
        f"Total Actual Output: {total_actual} packets",
        styles["Normal"]
    ))
    content.append(Paragraph(
        f"Overall Yield Variance: {overall_yield:.2f}%",
        styles["Normal"]
    ))
    content.append(Spacer(1, 8))

    production_rows = [[
        "Batch", "Product", "Planned", "Actual", "Yield %", "Expenses"
    ]]

    for batch in batches:
        product = db.query(Product).filter(
            Product.id == batch.product_id
        ).first()

        planned = batch.planned_output or 0
        actual = batch.actual_good_output or 0

        yield_percent = (
            ((actual - planned) / planned) * 100
            if planned > 0 else 0
        )

        expenses = db.query(
            func.coalesce(func.sum(Expense.amount), 0)
        ).filter(
            Expense.production_batch_id == batch.id
        ).scalar()

        production_rows.append([
            batch.batch_number,
            product.name if product else "Unknown",
            str(planned),
            str(actual),
            f"{yield_percent:.2f}%",
            money(expenses)
        ])

    content.append(make_table(
        production_rows,
        [90, 105, 55, 55, 65, 80]
    ))
    content.append(Spacer(1, 15))

    # 3. MATERIAL USAGE VARIANCE
    content.append(
        Paragraph("3. Material Usage Variance", styles["Heading2"])
    )

    variance_rows = [[
        "Batch", "Material", "Standard", "Actual",
        "Variance", "Variance %"
    ]]

    for batch in batches:
        bom_items = db.query(BOMItem).filter(
            BOMItem.product_id == batch.product_id
        ).all()

        for bom in bom_items:
            material = db.query(RawMaterial).filter(
                RawMaterial.id == bom.raw_material_id
            ).first()

            if not material:
                continue

            standard = (
                Decimal(str(bom.quantity_required))
                * Decimal(str(batch.actual_good_output or 0))
                / Decimal(str(bom.output_quantity))
                if bom.output_quantity else Decimal("0")
            )

            actual_usage = db.query(
                func.coalesce(
                    func.sum(StockMovement.quantity_out), 0
                )
            ).filter(
                StockMovement.reference == batch.batch_number,
                StockMovement.raw_material_id == material.id
            ).scalar()

            actual_usage = Decimal(str(actual_usage or 0))
            standard = Decimal(str(standard))

            variance = actual_usage - standard

            variance_percent = (
                (variance / standard) * 100
                if standard > 0 else Decimal("0")
            )

            variance_rows.append([
                batch.batch_number,
                material.name,
                f"{standard:.3f} {material.unit}",
                f"{actual_usage:.3f} {material.unit}",
                f"{variance:.3f} {material.unit}",
                f"{variance_percent:.2f}%"
            ])

    if len(variance_rows) == 1:
        variance_rows.append([
            "-", "No material usage data", "-", "-", "-", "-"
        ])

    content.append(make_table(
        variance_rows,
        [75, 85, 85, 85, 85, 65]
    ))
    content.append(Spacer(1, 15))

    # 4. SALES AND DISPATCH REPORT
    content.append(
        Paragraph("4. Sales and Dispatch Report", styles["Heading2"])
    )

    orders = db.query(SalesOrder).order_by(
        SalesOrder.id.asc()
    ).all()

    total_orders = len(orders)
    total_ordered = 0
    total_dispatched = 0

    sales_rows = [[
        "Order", "Customer", "Product", "Ordered",
        "Available", "Dispatched", "Shortage", "Status"
    ]]

    for order in orders:
        customer = db.query(Customer).filter(
            Customer.id == order.customer_id
        ).first()

        order_items = db.query(SalesOrderItem).filter(
            SalesOrderItem.order_id == order.id
        ).all()

        for item in order_items:
            product = db.query(Product).filter(
                Product.id == item.product_id
            ).first()

            if not product:
                continue

            stock_totals = db.query(
                func.coalesce(func.sum(StockMovement.quantity_in), 0),
                func.coalesce(func.sum(StockMovement.quantity_out), 0)
            ).filter(
                StockMovement.product_id == product.id
            ).first()

            current_stock = int(
                stock_totals[0] - stock_totals[1]
            )

            dispatched = db.query(
                func.coalesce(
                    func.sum(Dispatch.quantity_dispatched), 0
                )
            ).filter(
                Dispatch.order_id == order.id
            ).scalar()

            dispatched = int(dispatched or 0)

            available = current_stock + dispatched
            shortage = max(0, item.quantity - available)

            total_ordered += item.quantity
            total_dispatched += dispatched

            sales_rows.append([
                order.order_number,
                customer.name if customer else "Unknown",
                product.name,
                str(item.quantity),
                str(available),
                str(dispatched),
                str(shortage),
                order.status
            ])

    content.append(Paragraph(
        f"Total Orders: {total_orders} | "
        f"Ordered: {total_ordered} packets | "
        f"Dispatched: {total_dispatched} packets",
        styles["Normal"]
    ))
    content.append(Spacer(1, 8))

    content.append(make_table(
        sales_rows,
        [65, 75, 85, 45, 50, 55, 50, 65]
    ))
    content.append(Spacer(1, 15))

    # 5. FINANCIAL SUMMARY
    content.append(
        Paragraph("5. Financial Summary", styles["Heading2"])
    )

    invoices = db.query(Invoice).all()
    payments = db.query(Payment).all()
    expenses = db.query(Expense).all()

    invoice_value = sum(
        (Decimal(str(item.total_amount)) for item in invoices),
        Decimal("0.00")
    )

    payments_received = sum(
        (Decimal(str(item.amount)) for item in payments),
        Decimal("0.00")
    )

    outstanding = Decimal("0.00")

    for invoice in invoices:
        paid = db.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.invoice_id == invoice.id
        ).scalar()

        balance = (
            Decimal(str(invoice.total_amount))
            - Decimal(str(paid or 0))
        )

        outstanding += max(Decimal("0.00"), balance)

    production_expenses = sum(
        (
            Decimal(str(item.amount))
            for item in expenses
            if item.production_batch_id is not None
        ),
        Decimal("0.00")
    )

    financial_rows = [
        ["Description", "Amount"],
        ["Total Invoice Value", money(invoice_value)],
        ["Payments Received", money(payments_received)],
        ["Outstanding Amount", money(outstanding)],
        ["Production Expenses", money(production_expenses)]
    ]

    content.append(make_table(
        financial_rows,
        [250, 150]
    ))
    content.append(Spacer(1, 15))

    # 6. GST SUMMARY
    content.append(
        Paragraph("6. GST Summary", styles["Heading2"])
    )

    taxable = sum(
        (Decimal(str(item.taxable_amount)) for item in invoices),
        Decimal("0.00")
    )
    cgst = sum(
        (Decimal(str(item.cgst_amount)) for item in invoices),
        Decimal("0.00")
    )
    sgst = sum(
        (Decimal(str(item.sgst_amount)) for item in invoices),
        Decimal("0.00")
    )
    igst = sum(
        (Decimal(str(item.igst_amount)) for item in invoices),
        Decimal("0.00")
    )

    gst_rows = [
        ["Description", "Amount"],
        ["Taxable Value", money(taxable)],
        ["CGST", money(cgst)],
        ["SGST", money(sgst)],
        ["IGST", money(igst)],
        ["Total GST", money(cgst + sgst + igst)]
    ]

    content.append(make_table(
        gst_rows,
        [250, 150]
    ))

    content.append(Spacer(1, 20))
    content.append(
        Paragraph(
            "Generated by the Order-to-Audit System.",
            styles["Italic"]
        )
    )

    document.build(content)
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                'attachment; filename="Business_Performance_Report.pdf"'
        }
    )

@app.get(
    "/audit/logs",
    dependencies=[Depends(require_roles(
        "Owner",
        "Admin",
        "Accountant/Auditor"
    ))]
)
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    logs = db.query(
        AuditLog,
        User.full_name
    ).outerjoin(
        User,
        AuditLog.actor_id == User.id
    ).order_by(
        AuditLog.created_at.desc()
    ).limit(limit).all()

    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "actor_name": actor_name or "Unknown User",
                "action": log.action,
                "module": log.module,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "description": log.description,
                "details": log.details,
                "created_at": (
                    log.created_at.isoformat()
                    if log.created_at else None
                )
            }
            for log, actor_name in logs
        ]
    }
