
from database import SessionLocal
from models import (
    SalesOrder,
    SalesOrderItem,
    Invoice,
    Dispatch,
    StockMovement,
    Product
)
from decimal import Decimal

db = SessionLocal()

try:
    order = db.query(SalesOrder).filter(
        SalesOrder.order_number == "ORD-001"
    ).with_for_update().first()

    if not order:
        raise Exception("Order not found!")

    if order.status not in ["APPROVED", "PARTIALLY_DISPATCHED"]:
        raise Exception("Order is not approved for dispatch!")

    invoice = db.query(Invoice).filter(
        Invoice.order_id == order.id
    ).first()

    if not invoice or invoice.status != "ISSUED":
        raise Exception("Valid invoice not found!")

    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.order_id == order.id
    ).all()

    for item in items:
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()

        already_dispatched = db.query(
            db.query(Dispatch).filter(
                Dispatch.order_id == order.id
            ).exists()
        ).scalar()

        if already_dispatched:
            raise Exception("This order has already been dispatched!")

        stock_in = sum(
            (m.quantity_in for m in db.query(StockMovement).filter(
                StockMovement.product_id == product.id
            ).all()),
            Decimal("0")
        )

        stock_out = sum(
            (m.quantity_out for m in db.query(StockMovement).filter(
                StockMovement.product_id == product.id
            ).all()),
            Decimal("0")
        )

        available_stock = stock_in - stock_out

        if available_stock < item.quantity:
            raise Exception("Insufficient stock!")

        dispatch = Dispatch(
            dispatch_number="DSP-001",
            order_id=order.id,
            quantity_dispatched=item.quantity,
            status="DISPATCHED"
        )

        movement = StockMovement(
            product_id=product.id,
            movement_type="SALES_DISPATCH",
            quantity_in=0,
            quantity_out=item.quantity,
            reference="DSP-001",
            notes="Dispatch for order ORD-001"
        )

        db.add(dispatch)
        db.add(movement)

    order.status = "DISPATCHED"

    db.commit()

    print("========== DISPATCH COMPLETED ==========")
    print("Order:", order.order_number)
    print("Dispatch: DSP-001")
    print("Quantity Dispatched: 150")
    print("Remaining Stock:", available_stock - item.quantity)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
