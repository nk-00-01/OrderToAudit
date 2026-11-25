
from database import SessionLocal
from models import ProductionBatch, Product

db = SessionLocal()

try:
    # Find our Murukku product
    product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if not product:
        print("Product not found!")
    else:
        # Check whether this batch already exists
        existing_batch = db.query(ProductionBatch).filter(
            ProductionBatch.batch_number == "PROD-001"
        ).first()

        if existing_batch:
            print("Production batch already exists!")
        else:
            batch = ProductionBatch(
                batch_number="PROD-001",
                product_id=product.id,
                planned_output=200,
                actual_good_output=188,
                damaged_pouches=6,
                status="COMPLETED"
            )

            db.add(batch)
            db.commit()

            print("Production batch created successfully!")
            print("Batch Number:", batch.batch_number)
            print("Product:", product.name)
            print("Planned Output:", batch.planned_output)
            print("Actual Good Output:", batch.actual_good_output)

finally:
    db.close()
