
from getpass import getpass

from database import SessionLocal
from models import User, Role
from auth import hash_password


def create_owner():
    db = SessionLocal()

    try:
        role = db.query(Role).filter(Role.name == "OWNER").first()

        if not role:
            role = Role(name="OWNER")
            db.add(role)
            db.commit()
            db.refresh(role)

        email = input("Enter owner email: ").strip().lower()

        existing_user = db.query(User).filter(
            User.email == email
        ).first()

        if existing_user:
            print("An account with this email already exists.")
            return

        full_name = input("Enter owner full name: ").strip()
        password = getpass("Create owner password: ")
        confirm_password = getpass("Confirm owner password: ")

        if not email or not full_name:
            print("Email and name cannot be empty.")
            return

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            return

        if password != confirm_password:
            print("Passwords do not match.")
            return

        owner = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            is_active=True
        )

        db.add(owner)
        db.commit()

        print("\nOwner account created successfully!")
        print("Email:", email)
        print("Role: OWNER")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_owner()
