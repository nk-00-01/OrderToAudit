
from database import SessionLocal
from models import RawMaterial

db = SessionLocal()

materials = [
    {
        "sku": "RAW-FLOUR",
        "name": "Flour",
        "unit": "kg",
        "cost_per_unit": 45.00
    },
    {
        "sku": "RAW-OIL",
        "name": "Oil",
        "unit": "litre",
        "cost_per_unit": 0.00
    },
    {
        "sku": "RAW-SPICE",
        "name": "Spice",
        "unit": "kg",
        "cost_per_unit": 0.00
    },
    {
        "sku": "PKG-POUCH",
        "name": "Packaging Pouch",
        "unit": "piece",
        "cost_per_unit": 0.00
    },
    {
        "sku": "PKG-CARTON",
        "name": "Carton",
        "unit": "piece",
        "cost_per_unit": 0.00
    }
]

try:
    for material in materials:
        existing = db.query(RawMaterial).filter(
            RawMaterial.sku == material["sku"]
        ).first()

        if not existing:
            new_material = RawMaterial(**material)
            db.add(new_material)

    db.commit()
    print("Raw materials added successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
