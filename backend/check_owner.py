from getpass import getpass

from database import SessionLocal
from models import User
from auth import verify_password

db = SessionLocal()

try:
    email = input("Enter owner email: ").strip().lower()
    password = getpass("Enter owner password: ")

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        print("User not found")
    elif verify_password(password, user.password_hash):
        print("PASSWORD MATCHES")
    else:
        print("PASSWORD DOES NOT MATCH")

finally:
    db.close()