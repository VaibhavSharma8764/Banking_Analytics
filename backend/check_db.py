from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    count = conn.execute(text("SELECT count(*) FROM transactions")).scalar()
    print(f"Total transactions in database: {count}")

    users = conn.execute(text("SELECT username, role FROM users")).fetchall()
    print(f"Users in database: {users}")
