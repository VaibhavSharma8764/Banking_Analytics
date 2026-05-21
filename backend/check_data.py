from sqlalchemy import text
from database import engine

def check():
    query = text("SELECT branch, status, COUNT(*) FROM transactions GROUP BY branch, status")
    with engine.connect() as conn:
        result = conn.execute(query).fetchall()
        print("Branch | Status | Count")
        print("-" * 30)
        for row in result:
            print(f"{row[0]} | {row[1]} | {row[2]}")

if __name__ == "__main__":
    check()
