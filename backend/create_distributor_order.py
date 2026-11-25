
from decimal import Decimal
from database import SessionLocal
from models import Customer, Product, SalesOrder, SalesOrderItem, StockMovement

db = SessionLocal()

try:
    customer = db.query(Customer).filter(
        Customer.name == "Distributor B"
    ).first()

    product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if not customer or not product:
        raise Exception("Customer or product not found!")

    existing = db.query(SalesOrder).filter(
        SalesOrder.order_number == "ORD-002"
    ).first()

    if existing:
        print("Order ORD-002 already exists!")
    else:
        order = SalesOrder(
            order_number="ORD-002",
            customer_id=customer.id,
            status="PENDING"
        )

        db.add(order)
        db.flush()

        item = SalesOrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=120,
            unit_price=Decimal("50.00")
        )

        db.add(item)
        db.commit()

        print("Distributor order created!")
        print("Order:", order.order_number)
        print("Customer:", customer.name)
        print("Requested Quantity:", item.quantity)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
