
from decimal import Decimal
from sqlalchemy import func
from database import SessionLocal
from models import (
    SalesOrder,
    SalesOrderItem,
    Invoice,
    Product,
    StockMovement
)

db = SessionLocal()

try:
    order = db.query(SalesOrder).filter(
        SalesOrder.order_number == "ORD-001"
    ).with_for_update().first()

    if not order:
        raise Exception("Order not found!")

    if order.status == "APPROVED":
        print("Order is already approved!")
    elif order.status != "PENDING":
        raise Exception("Order cannot be approved in its current status!")
    else:
        items = db.query(SalesOrderItem).filter(
            SalesOrderItem.order_id == order.id
        ).all()

        if not items:
            raise Exception("Order has no items!")

        taxable_amount = Decimal("0.00")

        for item in items:
            product = db.query(Product).filter(
                Product.id == item.product_id
            ).first()

            stock_in = db.query(
                func.coalesce(func.sum(StockMovement.quantity_in), 0)
            ).filter(
                StockMovement.product_id == product.id
            ).scalar()

            stock_out = db.query(
                func.coalesce(func.sum(StockMovement.quantity_out), 0)
            ).filter(
                StockMovement.product_id == product.id
            ).scalar()

            available_stock = Decimal(str(stock_in)) - Decimal(str(stock_out))

            if available_stock < item.quantity:
                raise Exception(
                    f"Insufficient stock for {product.name}. "
                    f"Available: {available_stock}"
                )

            taxable_amount += item.unit_price * item.quantity

        # This project benchmark uses intra-state Retailer A
        cgst = (taxable_amount * Decimal("0.025")).quantize(
            Decimal("0.01")
        )
        sgst = cgst
        igst = Decimal("0.00")

        total = taxable_amount + cgst + sgst

        invoice = Invoice(
            invoice_number="INV-001",
            order_id=order.id,
            taxable_amount=taxable_amount,
            cgst_amount=cgst,
            sgst_amount=sgst,
            igst_amount=igst,
            total_amount=total
        )

        order.status = "APPROVED"

        db.add(invoice)
        db.commit()

        print("========== ORDER APPROVED ==========")
        print("Order:", order.order_number)
        print("Status:", order.status)

        print("\n========== GST INVOICE ==========")
        print("Invoice:", invoice.invoice_number)
        print("Taxable Amount:", taxable_amount)
        print("CGST:", cgst)
        print("SGST:", sgst)
        print("IGST:", igst)
        print("Invoice Total:", total)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()
