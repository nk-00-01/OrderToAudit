
from sqlalchemy import func

from database import SessionLocal
from models import RawMaterial, Product, StockMovement

db = SessionLocal()

try:
    print("\n========== RAW MATERIAL STOCK ==========\n")

    materials = db.query(RawMaterial).all()

    for material in materials:

        stock_in = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            )
        ).filter(
            StockMovement.raw_material_id == material.id
        ).scalar()

        stock_out = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.raw_material_id == material.id
        ).scalar()

        current_stock = stock_in - stock_out

        print(
            f"{material.name}: "
            f"{current_stock} {material.unit}"
        )

    print("\n========== FINISHED PRODUCT STOCK ==========\n")

    products = db.query(Product).all()

    for product in products:

        stock_in = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_in), 0
            )
        ).filter(
            StockMovement.product_id == product.id
        ).scalar()

        stock_out = db.query(
            func.coalesce(
                func.sum(StockMovement.quantity_out), 0
            )
        ).filter(
            StockMovement.product_id == product.id
        ).scalar()

        current_stock = stock_in - stock_out

        print(
            f"{product.name}: "
            f"{current_stock} {product.unit}"
        )

except Exception as error:
    print("Error:", error)

finally:
    db.close()
