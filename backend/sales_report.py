from database import SessionLocal
from models import SalesOrder, Invoice, Payment
from sqlalchemy import func
from decimal import Decimal

db = SessionLocal()

try:
    total_orders = db.query(func.count(SalesOrder.id)).scalar() or 0

    pending_orders = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.status == "PENDING"
    ).scalar() or 0

    dispatched_orders = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.status == "DISPATCHED"
    ).scalar() or 0

    taxable = db.query(func.sum(Invoice.taxable_amount)).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    cgst = db.query(func.sum(Invoice.cgst_amount)).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    sgst = db.query(func.sum(Invoice.sgst_amount)).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    igst = db.query(func.sum(Invoice.igst_amount)).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    invoice_total = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    payments = db.query(func.sum(Payment.amount)).join(
        Invoice, Payment.invoice_id == Invoice.id
    ).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    outstanding = invoice_total - payments

    print("\n========== SALES PERFORMANCE REPORT ==========")

    print(f"Total Orders       : {total_orders}")
    print(f"Pending Orders     : {pending_orders}")
    print(f"Dispatched Orders  : {dispatched_orders}")

    print("\n========== SALES & GST SUMMARY ==========")

    print(f"Taxable Sales      : Rs. {taxable:.2f}")
    print(f"CGST               : Rs. {cgst:.2f}")
    print(f"SGST               : Rs. {sgst:.2f}")
    print(f"IGST               : Rs. {igst:.2f}")
    print(f"Total Invoice Value: Rs. {invoice_total:.2f}")

    print("\n========== PAYMENT SUMMARY ==========")

    print(f"Payments Received  : Rs. {payments:.2f}")
    print(f"Outstanding Amount : Rs. {outstanding:.2f}")

    print("==============================================")

finally:
    db.close()