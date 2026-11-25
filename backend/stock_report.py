
from decimal import Decimal
from database import SessionLocal
from models import RawMaterial, Product, StockMovement
from sqlalchemy import func

db = SessionLocal()

try:
    print("\n========== RAW MATERIAL STOCK REPORT ==========")

    materials = db.query(RawMaterial).order_by(
        RawMaterial.id
    ).all()

    for material in materials:
        stock = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            ) - func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.raw_material_id == material.id
        ).scalar()

        stock = Decimal(str(stock))

        print(
            f"{material.name}: {stock:.3f} {material.unit}"
        )

    print("\n========== FINISHED GOODS STOCK REPORT ==========")

    products = db.query(Product).order_by(
        Product.id
    ).all()

    for product in products:
        stock = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            ) - func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.product_id == product.id
        ).scalar()

        stock = Decimal(str(stock))

        print(
            f"{product.name}: {stock:.3f} packets"
        )

    print("\n=================================================")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
