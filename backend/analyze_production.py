
from database import SessionLocal
from models import ProductionBatch, RawMaterial, StockMovement

db = SessionLocal()

try:
    batch_number = "PROD-001"

    batch = db.query(ProductionBatch).filter(
        ProductionBatch.batch_number == batch_number
    ).first()

    if not batch:
        raise Exception("Production batch not found!")

    print("========== PRODUCTION ANALYSIS ==========")

    planned = batch.planned_output
    actual = batch.actual_good_output

    yield_variance = ((actual - planned) / planned) * 100

    print("\n--- PRODUCTION OUTPUT ---")
    print("Planned Output:", planned)
    print("Actual Good Output:", actual)
    print("Output Difference:", actual - planned)
    print(f"Yield Variance: {yield_variance:.2f}%")

    print("\n--- MATERIAL USAGE VARIANCE ---")

    actual_usage = {
        "RAW-FLOUR": 40,
        "RAW-OIL": 10.5,
        "RAW-SPICE": 1.2,
        "PKG-POUCH": 194,
        "PKG-CARTON": 9
    }

    for sku, actual_qty in actual_usage.items():

        material = db.query(RawMaterial).filter(
            RawMaterial.sku == sku
        ).first()

        bom = db.query(__import__("models").BOMItem).filter(
            __import__("models").BOMItem.product_id == batch.product_id,
            __import__("models").BOMItem.raw_material_id == material.id
        ).first()

        standard_qty = (
            float(bom.quantity_required) *
            batch.actual_good_output /
            bom.output_quantity
        )

        variance = actual_qty - standard_qty
        variance_percent = (variance / standard_qty) * 100

        print(f"\n{material.name}")
        print(f"Standard Usage: {standard_qty:.3f}")
        print(f"Actual Usage:   {actual_qty:.3f}")
        print(f"Variance:       {variance:.3f}")
        print(f"Variance %:     {variance_percent:.2f}%")

finally:
    db.close()
