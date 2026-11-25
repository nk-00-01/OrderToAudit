
from database import SessionLocal
from models import StockMovement, RawMaterial, Product

db = SessionLocal()

try:
    movements = db.query(StockMovement).order_by(
        StockMovement.id
    ).all()

    print("\n========== STOCK MOVEMENT LEDGER ==========")

    for movement in movements:

        if movement.raw_material_id:
            item = db.query(RawMaterial).filter_by(
                id=movement.raw_material_id
            ).first()
            item_name = item.name

        else:
            item = db.query(Product).filter_by(
                id=movement.product_id
            ).first()
            item_name = item.name

        print("-------------------------------------------")
        print(f"Reference     : {movement.reference}")
        print(f"Item          : {item_name}")
        print(f"Transaction   : {movement.movement_type}")
        print(f"Stock In      : {movement.quantity_in}")
        print(f"Stock Out     : {movement.quantity_out}")
        print(f"Date          : {movement.created_at}")

    print("\n===========================================")
    print(f"Total Transactions: {len(movements)}")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
