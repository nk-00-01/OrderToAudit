
from decimal import Decimal
from database import SessionLocal
from models import Expense, ProductionBatch

db = SessionLocal()

try:
    batch = db.query(ProductionBatch).filter_by(
        batch_number="PROD-001"
    ).first()

    if not batch:
        raise Exception("Production batch PROD-001 not found")

    expenses = [
        {
            "expense_reference": "EXP-001",
            "expense_type": "LABOUR",
            "amount": Decimal("1200.00"),
            "notes": "Production labour expenses",
            "production_batch_id": batch.id
        },
        {
            "expense_reference": "EXP-002",
            "expense_type": "GAS_POWER",
            "amount": Decimal("600.00"),
            "notes": "Factory gas and electricity expenses",
            "production_batch_id": batch.id
        }
    ]

    for item in expenses:
        existing = db.query(Expense).filter_by(
            expense_reference=item["expense_reference"]
        ).first()

        if existing:
            existing.production_batch_id = batch.id
            print(f'{item["expense_reference"]} already exists; batch link updated.')
        else:
            db.add(Expense(**item))

    db.commit()

    print("\n========== PRODUCTION EXPENSES ==========")

    batch_expenses = db.query(Expense).filter_by(
        production_batch_id=batch.id
    ).all()

    total = sum(
        (expense.amount for expense in batch_expenses),
        Decimal("0.00")
    )

    for expense in batch_expenses:
        print(f"{expense.expense_type}: Rs. {expense.amount}")

    print("-----------------------------------------")
    print(f"Batch: {batch.batch_number}")
    print(f"Total Expenses: Rs. {total}")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
