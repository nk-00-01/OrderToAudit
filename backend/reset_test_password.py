from getpass import getpass
from pwdlib import PasswordHash
from database import SessionLocal
from models import User

db = SessionLocal()

try:
    user = db.query(User).filter(
        User.email == "salesman_test@example.com"
    ).first()

    if not user:
        print("Salesman account not found!")
    else:
        password = getpass("Enter new password: ")
        confirm = getpass("Confirm new password: ")

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
        elif password != confirm:
            print("Passwords do not match!")
        else:
            hasher = PasswordHash.recommended()
            user.password_hash = hasher.hash(password)
            db.commit()
            print("Salesman password reset successfully!")

finally:
    db.close()