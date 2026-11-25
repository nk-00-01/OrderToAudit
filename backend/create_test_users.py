
from getpass import getpass

from database import SessionLocal
from models import User, Role
from auth import hash_password


TEST_USERS = [
    ("Admin Test", "admin_test@example.com", "Admin"),
    ("Salesman Test", "salesman_test@example.com", "Salesman"),
    ("Production Test", "production_test@example.com", "Production Supervisor"),
    ("Auditor Test", "auditor_test@example.com", "Accountant/Auditor"),
]


def create_test_users():
    db = SessionLocal()

    try:
        for full_name, email, role_name in TEST_USERS:
            existing_user = db.query(User).filter(
                User.email == email
            ).first()

            if existing_user:
                print(f"Already exists: {email}")
                continue

            role = db.query(Role).filter(
                Role.name == role_name
            ).first()

            if not role:
                print(f"Role not found: {role_name}")
                continue

            print(f"\nCreating {role_name} user: {email}")
            password = getpass("Enter a password for this user: ")

            if len(password) < 12:
                print("Password must be at least 12 characters. Skipping.")
                continue

            user = User(
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role_id=role.id,
                is_active=True
            )

            db.add(user)
            db.commit()

            print(f"Created successfully: {email}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_test_users()
