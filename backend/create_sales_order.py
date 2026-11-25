
from database import SessionLocal
from models import Customer, Product, SalesOrder, SalesOrderItem
from decimal import Decimal

db = SessionLocal()

try:
    # Find Retailer A
    customer = db.query(Customer).filter(
        Customer.name == "Retailer A"
    ).first()

    # Find Murukku product
    product = db.query(Product).filter(
        Product.sku == "MUR-200"
    ).first()

    if not customer or not product:
        raise Exception("Customer or product not found!")

    # Prevent duplicate orders
    existing_order = db.query(SalesOrder).filter(
        SalesOrder.order_number == "ORD-001"
    ).first()

    if existing_order:
        print("Order ORD-001 already exists!")
    else:
        order = SalesOrder(
            order_number="ORD-001",
            customer_id=customer.id,
            status="PENDING"
        )

        db.add(order)
        db.flush()

        order_item = SalesOrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=150,
            unit_price=Decimal("50.00")
        )

        db.add(order_item)
        db.commit()

        print("Sales order created successfully!")
        print("Order Number:", order.order_number)
        print("Customer:", customer.name)
        print("Product:", product.name)
        print("Quantity:", order_item.quantity)
        print("Unit Price:", order_item.unit_price)
        print("Status:", order.status)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
