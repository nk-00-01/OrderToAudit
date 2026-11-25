
from decimal import Decimal
from sqlalchemy import func
from database import SessionLocal
from models import Invoice, Payment, Expense

db = SessionLocal()

try:
    # Invoice totals
    invoice_total = db.query(
        func.coalesce(func.sum(Invoice.total_amount), 0)
    ).filter(Invoice.status == "ISSUED").scalar()

    taxable_sales = db.query(
        func.coalesce(func.sum(Invoice.taxable_amount), 0)
    ).filter(Invoice.status == "ISSUED").scalar()

    # Customer payments
    payment_total = db.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).scalar()

    # Outstanding amount
    outstanding = Decimal(str(invoice_total)) - Decimal(str(payment_total))

    # Business expenses
    expense_total = db.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).scalar()

    invoice_total = Decimal(str(invoice_total))
    taxable_sales = Decimal(str(taxable_sales))
    payment_total = Decimal(str(payment_total))
    expense_total = Decimal(str(expense_total))

    print("\n========== FINANCIAL SUMMARY ==========")

    print(f"Total Taxable Sales : Rs. {taxable_sales:.2f}")
    print(f"Total Invoice Value : Rs. {invoice_total:.2f}")
    print(f"Customer Payments   : Rs. {payment_total:.2f}")
    print(f"Outstanding Amount  : Rs. {outstanding:.2f}")

    print("---------------------------------------")

    print(f"Total Expenses      : Rs. {expense_total:.2f}")

    print("=======================================")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
