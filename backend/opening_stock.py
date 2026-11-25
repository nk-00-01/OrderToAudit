
from decimal import Decimal

from database import SessionLocal
from models import Product, RawMaterial, StockMovement

db = SessionLocal()

# Opening quantities from the project specification
raw_opening_stock = [
    ("RAW-FLOUR", "100"),
    ("RAW-OIL", "30"),
    ("RAW-SPICE", "5"),
    ("PKG-POUCH", "500"),
    ("PKG-CARTON", "30")
]

try:
    # Add opening stock for raw materials
    for sku, quantity in raw_opening_stock:

        material = db.query(RawMaterial).filter(
            RawMaterial.sku == sku
        ).first()

        if not material:
            raise Exception(f"Material not found: {sku}")

        existing = db.query(StockMovement).filter(
            StockMovement.raw_material_id == material.id,
            StockMovement.movement_type == "OPENING"
        ).first()

        if not existing:
            movement = StockMovement(
                raw_material_id=material.id,
                movement_type="OPENING",
                quantity_in=Decimal(quantity),
                quantity_out=Decimal("0"),
                reference="OPENING-001",
                notes="Initial raw material stock"
            )

            db.add(movement)

    # Add opening finished-goods stock
    product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if not product:
        raise Exception("Murukku product not found!")

    existing_product_stock = db.query(StockMovement).filter(
        StockMovement.product_id == product.id,
        StockMovement.movement_type == "OPENING"
    ).first()

    if not existing_product_stock:
        movement = StockMovement(
            product_id=product.id,
            movement_type="OPENING",
            quantity_in=Decimal("50"),
            quantity_out=Decimal("0"),
            reference="OPENING-001",
            notes="Initial finished goods stock"
        )

        db.add(movement)

    db.commit()

    print("Opening stock added successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
