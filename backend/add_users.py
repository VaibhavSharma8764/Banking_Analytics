from database import engine
from sqlalchemy import text
from auth import get_password_hash

def add_extra_users():
    users = [
        {"u": "analyst", "p": "analyst123", "r": "analyst"},
        {"u": "operator", "p": "operator123", "r": "operator"}
    ]
    
    with engine.begin() as conn:
        for user in users:
            result = conn.execute(text("SELECT * FROM users WHERE username = :u"), {"u": user["u"]}).fetchone()
            if not result:
                hashed_pw = get_password_hash(user["p"])
                conn.execute(text("INSERT INTO users (username, password, role) VALUES (:u, :p, :r)"), 
                             {"u": user["u"], "p": hashed_pw, "r": user["r"]})
                print(f"User created: {user['u']} (Password: {user['p']}, Role: {user['r']})")
            else:
                print(f"User {user['u']} already exists.")

if __name__ == "__main__":
    add_extra_users()
