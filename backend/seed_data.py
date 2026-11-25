
from database import SessionLocal
from models import Role

# Five roles required for our project
roles = [
    "Owner",
    "Admin",
    "Salesman",
    "Production Supervisor",
    "Accountant/Auditor"
]

# Open a database session
db = SessionLocal()

try:
    for role_name in roles:

        # Check whether the role already exists
        existing_role = db.query(Role).filter(
            Role.name == role_name
        ).first()

        if not existing_role:
            new_role = Role(name=role_name)
            db.add(new_role)

    # Save all new roles
    db.commit()

    print("All roles added successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
