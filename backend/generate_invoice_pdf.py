
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from database import SessionLocal
from models import Invoice, SalesOrder, Customer, SalesOrderItem, Product

db = SessionLocal()

try:
    invoice = db.query(Invoice).filter(
        Invoice.invoice_number == "INV-001"
    ).first()

    if not invoice:
        raise Exception("Invoice not found!")

    order = db.query(SalesOrder).filter(
        SalesOrder.id == invoice.order_id
    ).first()

    customer = db.query(Customer).filter(
        Customer.id == order.customer_id
    ).first()

    items = db.query(SalesOrderItem).filter(
        SalesOrderItem.order_id == order.id
    ).all()

    filename = "INV-001.pdf"

    document = SimpleDocTemplate(filename, pagesize=A4)
    styles = getSampleStyleSheet()
    content = []

    content.append(Paragraph("GST TAX INVOICE", styles["Title"]))
    content.append(Spacer(1, 20))

    content.append(Paragraph(
        f"<b>Invoice Number:</b> {invoice.invoice_number}",
        styles["Normal"]
    ))

    content.append(Paragraph(
        f"<b>Order Number:</b> {order.order_number}",
        styles["Normal"]
    ))

    content.append(Paragraph(
        f"<b>Customer:</b> {customer.name}",
        styles["Normal"]
    ))

    content.append(Spacer(1, 20))

    table_data = [
        ["Product", "Quantity", "Unit Price", "Amount"]
    ]

    for item in items:
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()

        amount = item.quantity * item.unit_price

        table_data.append([
            product.name,
            str(item.quantity),
            f"Rs. {item.unit_price:.2f}",
            f"Rs. {amount:.2f}"
        ])

    table_data.extend([
        ["", "", "Taxable Amount", f"Rs. {invoice.taxable_amount:.2f}"],
        ["", "", "CGST", f"Rs. {invoice.cgst_amount:.2f}"],
        ["", "", "SGST", f"Rs. {invoice.sgst_amount:.2f}"],
        ["", "", "IGST", f"Rs. {invoice.igst_amount:.2f}"],
        ["", "", "Grand Total", f"Rs. {invoice.total_amount:.2f}"]
    ])

    table = Table(table_data, colWidths=[180, 70, 110, 130])

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 8)
    ]))

    content.append(table)

    content.append(Spacer(1, 30))
    content.append(Paragraph(
        "Thank you for your business!",
        styles["Normal"]
    ))

    document.build(content)

    print("Invoice PDF generated successfully!")
    print("File:", filename)

finally:
    db.close()
