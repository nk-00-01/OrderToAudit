from decimal import Decimal

from sqlalchemy import func
from database import SessionLocal
from models import Invoice, Payment


db = SessionLocal()

try:
    # Find the invoice
    invoice = db.query(Invoice).filter(
        Invoice.invoice_number == "INV-001"
    ).first()

    if not invoice:
        print("Invoice INV-001 not found!")
    else:
        # Prevent recording the same payment twice
        existing_payment = db.query(Payment).filter(
            Payment.reference_number == "PAY-001"
        ).first()

        if existing_payment:
            print("Payment PAY-001 already exists!")

        else:
            # Calculate previous payments
            paid_before = db.query(
                func.coalesce(func.sum(Payment.amount), 0)
            ).filter(
                Payment.invoice_id == invoice.id
            ).scalar()

            paid_before = Decimal(str(paid_before or 0))
            payment_amount = Decimal("4000.00")

            outstanding_before = invoice.total_amount - paid_before

            if payment_amount > outstanding_before:
                print("Payment exceeds the outstanding balance!")

            else:
                payment = Payment(
                    invoice_id=invoice.id,
                    amount=payment_amount,
                    payment_method="UPI",
                    reference_number="PAY-001",
                    notes="First payment from Retailer A"
                )

                db.add(payment)
                db.commit()

                total_paid = paid_before + payment_amount
                outstanding = invoice.total_amount - total_paid

                print("\n========== PAYMENT RECORDED ==========")
                print(f"Invoice Number: {invoice.invoice_number}")
                print(f"Invoice Amount: Rs. {invoice.total_amount}")
                print(f"Previous Payments: Rs. {paid_before}")
                print(f"New Payment: Rs. {payment_amount}")
                print(f"Total Paid: Rs. {total_paid}")
                print(f"Outstanding: Rs. {outstanding}")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()