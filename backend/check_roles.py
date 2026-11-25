from database import SessionLocal
from models import Role, User

db = SessionLocal()

try:
    print("========== ROLES ==========")

    roles = db.query(Role).order_by(Role.id).all()

    for role in roles:
        print(f"ID: {role.id} | Name: {role.name}")

    print("\n========== USERS ==========")

    users = db.query(User).all()

    for user in users:
        role = db.query(Role).filter(
            Role.id == user.role_id
        ).first()

        print(
            f"Name: {user.full_name} | "
            f"Role: {role.name if role else 'Unknown'}"
        )

finally:
    db.close()