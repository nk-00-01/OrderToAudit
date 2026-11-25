
from database import SessionLocal
from models import Product, RawMaterial, BOMItem

db = SessionLocal()

try:
    # Find our finished product
    product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if not product:
        raise Exception("Murukku product not found!")

    # Our manufacturing recipe
    recipe = [
        ("RAW-FLOUR", 40.000),
        ("RAW-OIL", 10.000),
        ("RAW-SPICE", 1.200),
        ("PKG-POUCH", 200.000),
        ("PKG-CARTON", 10.000)
    ]

    for material_sku, quantity in recipe:

        # Find the raw material
        material = db.query(RawMaterial).filter(
            RawMaterial.sku == material_sku
        ).first()

        if not material:
            raise Exception(
                f"Material not found: {material_sku}"
            )

        # Check whether this BOM entry already exists
        existing = db.query(BOMItem).filter(
            BOMItem.product_id == product.id,
            BOMItem.raw_material_id == material.id
        ).first()

        if not existing:
            bom_item = BOMItem(
                product_id=product.id,
                raw_material_id=material.id,
                quantity_required=quantity,
                output_quantity=200
            )

            db.add(bom_item)

    db.commit()

    print("Murukku BOM created successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
