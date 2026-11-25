
from decimal import Decimal

from database import SessionLocal
from models import RawMaterial, StockMovement

db = SessionLocal()

try:
    # Find flour
    flour = db.query(RawMaterial).filter(
        RawMaterial.sku == "RAW-FLOUR"
    ).first()

    if not flour:
        raise Exception("Flour not found!")

    # Prevent duplicate purchase entries
    existing = db.query(StockMovement).filter(
        StockMovement.raw_material_id == flour.id,
        StockMovement.reference == "PUR-001"
    ).first()

    if existing:
        print("This purchase is already recorded!")

    else:
        purchase = StockMovement(
            raw_material_id=flour.id,
            movement_type="PURCHASE",
            quantity_in=Decimal("60"),
            quantity_out=Decimal("0"),
            reference="PUR-001",
            notes="60 kg flour purchased at Rs. 45/kg. Total: Rs. 2700"
        )

        db.add(purchase)
        db.commit()

        print("Flour purchase recorded successfully!")
        print("Purchase quantity: 60 kg")
        print("Purchase value: Rs. 2700")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
