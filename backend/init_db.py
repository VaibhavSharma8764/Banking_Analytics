from database import engine
from sqlalchemy import text
from auth import get_password_hash

def init_db():
    print("Initializing database...")
    with engine.begin() as conn:
        # Create users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL
            )
        """))
        
        # Check if admin exists
        result = conn.execute(text("SELECT * FROM users WHERE username = 'admin'")).fetchone()
        if not result:
            hashed_pw = get_password_hash("admin123")
            conn.execute(text("INSERT INTO users (username, password, role) VALUES (:u, :p, :r)"), 
                         {"u": "admin", "p": hashed_pw, "r": "admin"})
            print("Admin user created (admin/admin123)")
        
        # Create transactions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                transaction_id VARCHAR(50),
                amount FLOAT,
                status VARCHAR(20),
                transaction_date VARCHAR(50),
                branch VARCHAR(50),
                processing_time FLOAT,
                transaction_size VARCHAR(20)
            )
        """))
        
        # Create upload_history table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS upload_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255),
                upload_time TIMESTAMP,
                records_processed INT
            )
        """))
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
