from database import SessionLocal
from models import (
    Product, RawMaterial, StockMovement,
    ProductionBatch, Invoice, Payment, Expense
)
from sqlalchemy import func
from decimal import Decimal

db = SessionLocal()

try:
    print("\n========== BUSINESS DASHBOARD ==========")

    # 1. Raw material stock
    print("\n--- RAW MATERIAL STOCK ---")

    materials = db.query(RawMaterial).all()

    for material in materials:
        stock_in = db.query(func.sum(StockMovement.quantity_in)).filter(
            StockMovement.raw_material_id == material.id
        ).scalar() or Decimal("0")

        stock_out = db.query(func.sum(StockMovement.quantity_out)).filter(
            StockMovement.raw_material_id == material.id
        ).scalar() or Decimal("0")

        balance = stock_in - stock_out

        print(f"{material.name}: {balance:.3f} {material.unit}")

    # 2. Finished goods stock
    print("\n--- FINISHED GOODS STOCK ---")

    products = db.query(Product).all()

    for product in products:
        stock_in = db.query(func.sum(StockMovement.quantity_in)).filter(
            StockMovement.product_id == product.id
        ).scalar() or Decimal("0")

        stock_out = db.query(func.sum(StockMovement.quantity_out)).filter(
            StockMovement.product_id == product.id
        ).scalar() or Decimal("0")

        balance = stock_in - stock_out

        print(f"{product.name}: {balance:.3f} packets")

    # 3. Production summary
    total_batches = db.query(func.count(ProductionBatch.id)).scalar() or 0

    total_production = db.query(
        func.sum(ProductionBatch.actual_good_output)
    ).scalar() or 0

    # 4. Sales summary
    taxable_sales = db.query(
        func.sum(Invoice.taxable_amount)
    ).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    invoice_total = db.query(
        func.sum(Invoice.total_amount)
    ).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    # 5. Payments
    payments = db.query(
        func.sum(Payment.amount)
    ).join(
        Invoice, Payment.invoice_id == Invoice.id
    ).filter(
        Invoice.status == "ISSUED"
    ).scalar() or Decimal("0")

    outstanding = invoice_total - payments

    # 6. Expenses
    total_expenses = db.query(
        func.sum(Expense.amount)
    ).scalar() or Decimal("0")

    print("\n--- PRODUCTION SUMMARY ---")
    print(f"Total Batches       : {total_batches}")
    print(f"Total Good Output   : {total_production} packets")

    print("\n--- SALES SUMMARY ---")
    print(f"Taxable Sales       : Rs. {taxable_sales:.2f}")
    print(f"Total Invoice Value : Rs. {invoice_total:.2f}")

    print("\n--- ACCOUNTS SUMMARY ---")
    print(f"Payments Received   : Rs. {payments:.2f}")
    print(f"Outstanding Balance : Rs. {outstanding:.2f}")
    print(f"Production Expenses : Rs. {total_expenses:.2f}")

    print("\n========================================")

finally:
    db.close()