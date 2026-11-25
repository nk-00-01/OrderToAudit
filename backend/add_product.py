
from database import SessionLocal
from models import Product

db = SessionLocal()

try:
    # Check whether this product already exists
    existing_product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if existing_product:
        print("Product already exists!")

    else:
        new_product = Product(
            sku="MUR-200",
            name="Murukku 200g",
            unit="packet",
            selling_price=50.00,
            gst_rate=5.00,
            is_active=True
        )

        db.add(new_product)
        db.commit()

        print("Murukku 200g added successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
