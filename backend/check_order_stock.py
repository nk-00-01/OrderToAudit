
from decimal import Decimal
from database import SessionLocal
from models import SalesOrder, SalesOrderItem, StockMovement

db = SessionLocal()

try:
    order = db.query(SalesOrder).filter(
        SalesOrder.order_number == "ORD-002"
    ).first()

    if not order:
        raise Exception("Order not found!")

    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.order_id == order.id
    ).all()

    for item in items:
        movements = db.query(StockMovement).filter(
            StockMovement.product_id == item.product_id
        ).all()

        stock_in = sum(
            (m.quantity_in for m in movements),
            Decimal("0")
        )

        stock_out = sum(
            (m.quantity_out for m in movements),
            Decimal("0")
        )

        available = stock_in - stock_out
        shortage = max(Decimal("0"), Decimal(item.quantity) - available)

        print("========== STOCK AVAILABILITY ==========")
        print("Requested:", item.quantity)
        print("Available:", available)
        print("Shortage:", shortage)

        if shortage > 0:
            print("RESULT: INSUFFICIENT STOCK")
        else:
            print("RESULT: STOCK AVAILABLE")

finally:
    db.close()
