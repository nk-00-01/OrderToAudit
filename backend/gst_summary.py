
from decimal import Decimal
from sqlalchemy import func
from database import SessionLocal
from models import Invoice

db = SessionLocal()

try:
    # Calculate totals from issued invoices
    totals = db.query(
        func.coalesce(func.sum(Invoice.taxable_amount), 0),
        func.coalesce(func.sum(Invoice.cgst_amount), 0),
        func.coalesce(func.sum(Invoice.sgst_amount), 0),
        func.coalesce(func.sum(Invoice.igst_amount), 0),
        func.coalesce(func.sum(Invoice.total_amount), 0)
    ).filter(
        Invoice.status == "ISSUED"
    ).one()

    taxable = Decimal(str(totals[0]))
    cgst = Decimal(str(totals[1]))
    sgst = Decimal(str(totals[2]))
    igst = Decimal(str(totals[3]))
    invoice_total = Decimal(str(totals[4]))

    total_gst = cgst + sgst + igst

    print("\n========== GST SUMMARY REPORT ==========")

    print(f"Total Taxable Sales : Rs. {taxable:.2f}")
    print(f"CGST Collected      : Rs. {cgst:.2f}")
    print(f"SGST Collected      : Rs. {sgst:.2f}")
    print(f"IGST Collected      : Rs. {igst:.2f}")

    print("----------------------------------------")

    print(f"Total GST           : Rs. {total_gst:.2f}")
    print(f"Total Invoice Value : Rs. {invoice_total:.2f}")

    print("========================================")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
