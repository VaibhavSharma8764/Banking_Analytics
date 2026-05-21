from database import engine
from sqlalchemy import text
from auth import get_password_hash

def hash_passwords():
    with engine.connect() as conn:
        users = conn.execute(text("SELECT id, password FROM users")).fetchall()
        
    with engine.begin() as conn:
        for user_id, plain_password in users:
            if not plain_password.startswith("$2b$"):  # Simple check for bcrypt hash
                hashed = get_password_hash(plain_password)
                conn.execute(
                    text("UPDATE users SET password = :hashed WHERE id = :id"),
                    {"hashed": hashed, "id": user_id}
                )
                print(f"Hashed password for user ID {user_id}")

if __name__ == "__main__":
    hash_passwords()
