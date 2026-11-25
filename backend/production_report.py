
from decimal import Decimal
from database import SessionLocal
from models import ProductionBatch, StockMovement, RawMaterial, BOMItem, Product

db = SessionLocal()

try:
    batch = db.query(ProductionBatch).filter_by(
        batch_number="PROD-001"
    ).first()

    if not batch:
        raise Exception("Production batch not found")

    product = db.query(Product).filter_by(
        id=batch.product_id
    ).first()

    print("\n========== PRODUCTION PERFORMANCE REPORT ==========")

    print(f"Batch Number       : {batch.batch_number}")
    print(f"Product            : {product.name}")
    print(f"Planned Output     : {batch.planned_output}")
    print(f"Actual Good Output : {batch.actual_good_output}")
    print(f"Damaged Pouches    : {batch.damaged_pouches}")

    difference = batch.actual_good_output - batch.planned_output

    yield_percentage = (
        Decimal(batch.actual_good_output)
        / Decimal(batch.planned_output)
    ) * Decimal("100")

    print(f"Output Difference  : {difference}")
    print(f"Yield Percentage   : {yield_percentage:.2f}%")

    print("\n========== MATERIAL CONSUMPTION VARIANCE ==========")

    bom_items = db.query(BOMItem).filter_by(
        product_id=product.id
    ).all()
    #print("BOM fields:", BOMItem.__table__.columns.keys())
    for bom in bom_items:
        material = db.query(RawMaterial).filter_by(
            id=bom.raw_material_id
        ).first()

        movement = db.query(StockMovement).filter_by(
            reference=batch.batch_number,
            raw_material_id=material.id
        ).first()

        actual = (
            Decimal(str(movement.quantity_out))
            if movement else Decimal("0")
        )

        standard = (
            Decimal(str(bom.quantity_required))
            * Decimal(batch.actual_good_output)
            / Decimal(bom.output_quantity)
        )

        variance = actual - standard

        if standard > 0:
            variance_percentage = (
                variance / standard
            ) * Decimal("100")
        else:
            variance_percentage = Decimal("0")

        print(f"\nMaterial          : {material.name}")
        print(f"Standard Usage    : {standard:.3f}")
        print(f"Actual Usage      : {actual:.3f}")
        print(f"Variance          : {variance:.3f}")
        print(f"Variance Percent  : {variance_percentage:.2f}%")

    print("\n====================================================")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
