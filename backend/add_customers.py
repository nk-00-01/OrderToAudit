
from database import SessionLocal
from models import Customer

db = SessionLocal()

customers = [
    {
        "name": "Retailer A",
        "customer_type": "Retailer",
        "state": "Tamil Nadu",
        "gstin": None,
        "phone": None
    },
    {
        "name": "Distributor B",
        "customer_type": "Distributor",
        "state": "Karnataka",
        "gstin": None,
        "phone": None
    }
]

try:
    for customer in customers:

        existing = db.query(Customer).filter(
            Customer.name == customer["name"]
        ).first()

        if not existing:
            new_customer = Customer(**customer)
            db.add(new_customer)

    db.commit()

    print("Customers added successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
