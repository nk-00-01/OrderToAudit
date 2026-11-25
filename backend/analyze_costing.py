
from decimal import Decimal
from database import SessionLocal
from models import (
    ProductionBatch,
    StockMovement,
    RawMaterial,
    Expense
)

db = SessionLocal()

try:
    batch = db.query(ProductionBatch).filter_by(
        batch_number="PROD-001"
    ).first()

    if not batch:
        raise Exception("Production batch not found")

    # Get raw material consumption for this batch
    movements = db.query(StockMovement).filter_by(
        reference=batch.batch_number
    ).all()

    material_cost = Decimal("0.00")

    print("\n========== RAW MATERIAL COST ==========")

    for movement in movements:
        if movement.raw_material_id is None:
            continue

        if movement.quantity_out <= 0:
            continue

        material = db.query(RawMaterial).filter_by(
            id=movement.raw_material_id
        ).first()

        cost = Decimal(str(material.unit_cost or 0))
        quantity = Decimal(str(movement.quantity_out))

        item_cost = quantity * cost
        material_cost += item_cost

        print(
            f"{material.name}: "
            f"{quantity} {material.unit} x Rs. {cost} "
            f"= Rs. {item_cost}"
        )

    # Get batch expenses
    expenses = db.query(Expense).filter_by(
        production_batch_id=batch.id
    ).all()

    expense_total = sum(
        (expense.amount for expense in expenses),
        Decimal("0.00")
    )

    print("\n========== OTHER EXPENSES ==========")

    for expense in expenses:
        print(f"{expense.expense_type}: Rs. {expense.amount}")

    # Total known production cost
    total_cost = material_cost + expense_total

    print("\n========== PRODUCTION COST SUMMARY ==========")

    print(f"Batch Number: {batch.batch_number}")
    print(f"Good Output: {batch.actual_good_output}")

    print(f"Known Material Cost: Rs. {material_cost}")
    print(f"Labour and Utility Cost: Rs. {expense_total}")

    print("---------------------------------------------")
    print(f"Total Known Production Cost: Rs. {total_cost}")

    if batch.actual_good_output > 0:
        cost_per_packet = (
            total_cost / Decimal(batch.actual_good_output)
        )

        print(f"Known Cost Per Packet: Rs. {cost_per_packet:.2f}")

    print("\nNOTE: Some material costs are not yet entered.")
    print("This is a partial production cost, not the final cost.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
