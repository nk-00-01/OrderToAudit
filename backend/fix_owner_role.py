
from database import SessionLocal
from models import User, Role

db = SessionLocal()

try:
    original_owner = db.query(Role).filter(
        Role.name == "Owner"
    ).first()

    duplicate_owner = db.query(Role).filter(
        Role.name == "OWNER"
    ).first()

    if not original_owner:
        raise Exception("Original Owner role not found")

    if duplicate_owner:
        users_using_duplicate = db.query(User).filter(
            User.role_id == duplicate_owner.id
        ).all()

        for user in users_using_duplicate:
            user.role_id = original_owner.id

        db.flush()

        db.delete(duplicate_owner)

    db.commit()

    print("Owner role standardized successfully!")

    owner = db.query(User).filter(
        User.email == input("Enter owner email: ").strip().lower()
    ).first()

    if owner:
        print("Owner:", owner.full_name)
        print("Role ID:", owner.role_id)
        print("Role:", original_owner.name)

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()
