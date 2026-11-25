
from types import SimpleNamespace

from fastapi.testclient import TestClient

from database import SessionLocal
from models import Role
from main import app
from auth import get_current_user


# Test-only Owner authentication
def fake_owner():
    db = SessionLocal()

    try:
        owner_role = db.query(Role).filter(
            Role.name == "Owner"
        ).first()

        assert owner_role is not None, "Owner role not found"

        return SimpleNamespace(
            id=1,
            role_id=owner_role.id,
            full_name="Test Owner",
            email="owner@test.com",
            is_active=True
        )
    finally:
        db.close()


app.dependency_overrides[get_current_user] = fake_owner

client = TestClient(app)


def test_home_endpoint():
    response = client.get("/")
    assert response.status_code == 200


def test_inventory_stock_endpoint():
    response = client.get("/inventory/stock")
    assert response.status_code == 200

    data = response.json()

    assert "total_items" in data
    assert "items" in data
    assert data["total_items"] == len(data["items"])
    assert data["total_items"] >= 1


def test_inventory_movements_endpoint():
    response = client.get("/inventory/movements")
    assert response.status_code == 200

    data = response.json()
    assert "movements" in data


def test_production_batches_endpoint():
    response = client.get("/production/batches")
    assert response.status_code == 200

    data = response.json()

    assert data["total_batches"] >= 1
    assert "batches" in data


def test_sales_orders_endpoint():
    response = client.get("/sales/orders")
    assert response.status_code == 200

    data = response.json()

    assert data["total_orders"] >= 1
    assert "orders" in data


def test_sales_invoices_endpoint():
    response = client.get("/sales/invoices")
    assert response.status_code == 200

    data = response.json()

    assert data["total_invoices"] >= 1
    assert "invoices" in data


def test_accounts_overview_endpoint():
    response = client.get("/accounts/overview")
    assert response.status_code == 200

    data = response.json()

    assert "summary" in data
    assert "payments" in data
    assert "expenses" in data


def test_inventory_stock_values():
    response = client.get("/inventory/stock")
    assert response.status_code == 200

    data = response.json()

    stock = {
        item["name"]: item["quantity"]
        for item in data["items"]
    }

    for name in [
        "Flour",
        "Oil",
        "Spice",
        "Packaging Pouch",
        "Carton",
        "Murukku 200g"
    ]:
        assert name in stock
        assert stock[name] >= 0


def test_production_yield_variance():
    response = client.get("/production/batches")
    assert response.status_code == 200

    batches = response.json()["batches"]

    batch = next(
        item for item in batches
        if item["batch_number"] == "PROD-001"
    )

    assert batch["planned_output"] == 200
    assert batch["actual_good_output"] == 188
    assert batch["yield_variance_percent"] == -6


def test_invoice_calculation():
    response = client.get("/sales/invoices")
    assert response.status_code == 200

    invoices = response.json()["invoices"]

    invoice = next(
        item for item in invoices
        if item["invoice_number"] == "INV-001"
    )

    assert invoice["taxable_amount"] == 7500
    assert invoice["cgst_amount"] == 187.5
    assert invoice["sgst_amount"] == 187.5
    assert invoice["total_amount"] == 7875


def test_payment_and_outstanding():
    response = client.get("/sales/invoices")
    assert response.status_code == 200

    invoices = response.json()["invoices"]

    invoice = next(
        item for item in invoices
        if item["invoice_number"] == "INV-001"
    )

    assert invoice["paid_amount"] == 4000
    assert invoice["outstanding_amount"] == 3875


def test_sales_order_shortage():
    response = client.get("/sales/orders")
    assert response.status_code == 200

    orders = response.json()["orders"]

    distributor_order = next(
        order for order in orders
        if order["order_number"] == "ORD-002"
    )

    assert distributor_order["quantity"] == 120

    expected_shortage = max(
        0,
        distributor_order["quantity"]
        - distributor_order["available_quantity"]
        - distributor_order["dispatched_quantity"]
    )

    assert distributor_order["shortage"] == expected_shortage
