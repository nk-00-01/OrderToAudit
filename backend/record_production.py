
from database import SessionLocal
from models import (
    ProductionBatch,
    Product,
    RawMaterial,
    StockMovement
)

db = SessionLocal()

try:
    batch_number = "PROD-001"

    batch = db.query(ProductionBatch).filter(
        ProductionBatch.batch_number == batch_number
    ).first()

    if not batch:
        raise Exception("Production batch not found!")

    # Prevent duplicate stock entries
    existing = db.query(StockMovement).filter(
        StockMovement.reference == batch_number
    ).first()

    if existing:
        print("Production stock movements already recorded!")
    else:
        materials = {
            "RAW-FLOUR": 40,
            "RAW-OIL": 10.5,
            "RAW-SPICE": 1.2,
            "PKG-POUCH": 194,
            "PKG-CARTON": 9
        }

        for sku, quantity in materials.items():
            material = db.query(RawMaterial).filter(
                RawMaterial.sku == sku
            ).first()

            if not material:
                raise Exception(f"Material not found: {sku}")

            movement = StockMovement(
                raw_material_id=material.id,
                movement_type="PRODUCTION_CONSUMPTION",
                quantity_in=0,
                quantity_out=quantity,
                reference=batch_number,
                notes=f"Material consumed for {batch_number}"
            )

            db.add(movement)

        # Add finished goods to stock
        product = db.query(Product).filter(
            Product.id == batch.product_id
        ).first()

        output_movement = StockMovement(
            product_id=product.id,
            movement_type="PRODUCTION_OUTPUT",
            quantity_in=batch.actual_good_output,
            quantity_out=0,
            reference=batch_number,
            notes=f"Finished goods produced in {batch_number}"
        )

        db.add(output_movement)

        db.commit()

        print("Production stock movements recorded!")
        print("Batch:", batch_number)
        print("Good packets produced:", batch.actual_good_output)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
