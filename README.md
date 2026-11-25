# OrderToAudit

### Integrated Inventory, Production, Sales & Audit Management System

<p align="center">
  A centralized business management platform designed for small and medium-scale manufacturers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</p>

---

## Overview

**OrderToAudit** is an integrated business management system that connects inventory, production, sales, invoicing, payments, and financial reporting in one platform.

It is designed around a manufacturing workflow where every business transaction can be tracked, helping reduce manual calculations, improve stock visibility, monitor production performance, and maintain transaction records.

Instead of managing different business operations separately, OrderToAudit brings them together through a centralized application.

## Key Features

### 📦 Inventory Management
- Track raw materials, packaging materials, and finished goods.
- Record material purchases and stock adjustments.
- Maintain a transaction-based stock ledger.
- Prevent stock adjustments that would result in negative inventory.
- View current stock levels and inventory summaries.

### 🏭 Production Management
- Create and manage production batches.
- Define and use Bills of Materials (BOM).
- Track planned output and actual good output.
- Record damaged packaging and material consumption.
- Calculate production yield and material usage variance.
- Associate production expenses with batches.

### 🛒 Sales Management
- Create and manage customer sales orders.
- Track order status and available finished stock.
- Validate stock availability before order approval.
- Manage dispatch records and quantities.

### 🧾 Invoice Management
- Generate invoices from approved sales orders.
- Calculate applicable GST components.
- Generate downloadable PDF invoices.
- Track invoice status and outstanding amounts.

### 💰 Accounts Management
- Record customer payments.
- Prevent overpayments against invoices.
- Track payment history and outstanding balances.
- Record and review business expenses.

### 📊 Reports & Analytics
- Inventory summaries and stock reports.
- Production performance reports.
- Material usage variance analysis.
- Sales and dispatch reports.
- Financial summaries.
- GST summaries.
- Downloadable business performance PDF reports.

### 🔐 Authentication & Role-Based Access
- JWT-based authentication.
- Password hashing.
- Role-based access control.
- Protected API endpoints.

Supported roles:
- Owner
- Admin
- Salesman
- Production Supervisor
- Accountant / Auditor

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT, Argon2 password hashing |
| PDF Generation | ReportLab |
| Testing | Pytest, FastAPI TestClient |
| Version Control | Git, GitHub |

---

## System Architecture

```text
             ┌─────────────────────────┐
             │      React Frontend     │
             │   Vite + Tailwind CSS   │
             └────────────┬────────────┘
                          │
                     REST APIs
                          │
             ┌────────────▼────────────┐
             │      FastAPI Backend    │
             │                         │
             │  Authentication & RBAC  │
             │  Inventory Management   │
             │  Production Management  │
             │  Sales & Invoicing      │
             │  Accounts & Payments    │
             │  Reports & Analytics    │
             └────────────┬────────────┘
                          │
                    SQLAlchemy ORM
                          │
             ┌────────────▼────────────┐
             │       PostgreSQL        │
             │                         │
             │ Customers, Products     │
             │ Stock Movements         │
             │ Production Batches      │
             │ Orders & Invoices       │
             │ Payments & Expenses     │
             └─────────────────────────┘
```

## Business Workflow

```text
Raw Material Purchase
          │
          ▼
   Inventory Update
          │
          ▼
   Production Planning
          │
          ▼
   Material Consumption
          │
          ▼
   Finished Goods Stock
          │
          ▼
     Sales Order
          │
          ▼
   Stock Verification
          │
          ▼
    Order Approval
          │
          ▼
   GST Invoice Creation
          │
          ▼
       Dispatch
          │
          ▼
   Customer Payment
          │
          ▼
   Financial Reporting
          │
          ▼
      Audit Records
```

---

## Project Structure

```text
OrderToAudit/
│
├── backend/
│   ├── tests/
│   │   └── test_api.py
│   │
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── auth.py
│   │
│   ├── init_db.py
│   ├── seed_data.py
│   │
│   ├── add_bom.py
│   ├── add_customers.py
│   ├── add_materials.py
│   ├── add_product.py
│   │
│   ├── record_purchase.py
│   ├── record_production.py
│   ├── approve_and_invoice.py
│   ├── dispatch_order.py
│   ├── record_payment.py
│   ├── record_expenses.py
│   │
│   └── ...other business modules
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── Accounts.jsx
│   │   ├── Inventory.jsx
│   │   ├── Invoices.jsx
│   │   ├── Login.jsx
│   │   ├── Production.jsx
│   │   ├── Reports.jsx
│   │   ├── SalesOrders.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## Getting Started

### 1. Prerequisites

Install the following:

- Python
- Node.js and npm
- PostgreSQL
- Git

### 2. Clone the Repository

```bash
git clone https://github.com/nk-00-01/OrderToAudit.git
cd OrderToAudit
```

### 3. Backend Setup

Open a terminal in the project root.

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies used by the project:

```powershell
pip install fastapi uvicorn sqlalchemy psycopg[binary] python-dotenv pwdlib[argon2] PyJWT python-multipart reportlab pytest httpx
```

### 4. Environment Configuration

Create a `.env` file inside the `backend` directory.

Configure your PostgreSQL connection using the environment variable names expected by `database.py`.

Add a strong, randomly generated JWT secret:

```env
SECRET_KEY=your_generated_random_secret
```

**Important:** Never commit your `.env` file or expose database credentials and secret keys.

### 5. Database Setup

Create a PostgreSQL database named:

```text
order_to_audit
```

Configure the database connection in your backend environment.

Initialize the database:

```powershell
python init_db.py
```

If you want to load the demonstration data, use the project's seed and setup scripts according to their required execution order.

### 6. Run the Backend

From the `backend` directory:

```powershell
python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 7. Frontend Setup

Open a second terminal:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Testing

The backend API test suite uses Pytest.

From the `backend` directory:

```powershell
python -m pytest -W default
```

**Current test result:**

```text
12 passed, 1 warning
```

The warning is a Starlette TestClient/httpx deprecation notice and does not cause the tests to fail.

## Production Build

To create an optimized frontend production build:

```powershell
cd frontend
npm run build
```

The generated production files are placed in the `dist` directory.

---

## Security & Data Integrity

The system incorporates:

- JWT authentication.
- Password hashing.
- Role-based endpoint authorization.
- Stock availability validation.
- Prevention of negative stock adjustments.
- Payment and overpayment validation.
- Transaction-based inventory tracking.
- Protected environment configuration.

**Note:** GST calculations and invoice configuration should be verified against the actual business registration details and applicable tax requirements before real-world use.

---

## Project Highlights

- Integrated manufacturing business workflow.
- Centralized inventory and transaction tracking.
- BOM-based production monitoring.
- Production yield and material variance calculations.
- GST invoice generation.
- Customer payment and outstanding tracking.
- Role-based application access.
- Downloadable PDF reports.
- Backend API test coverage.

## Future Enhancements

- Dashboard charts and advanced business analytics.
- Automated email notifications.
- Cloud deployment.
- More comprehensive audit logs.
- Excel report exports.
- Improved automated test coverage.
- Fine-grained permissions and configurable business settings.

---

## Author

**OrderToAudit** — Full-stack manufacturing management project.

GitHub: [@nk-00-01](https://github.com/nk-00-01)

Project Repository: [OrderToAudit](https://github.com/nk-00-01/OrderToAudit)

---

<p align="center">
  <b>OrderToAudit</b><br/>
  Connecting Inventory • Production • Sales • Accounts • Audit
</p>
