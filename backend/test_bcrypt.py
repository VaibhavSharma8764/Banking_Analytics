from passlib.context import CryptContext
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    print("Bcrypt initialized")
    h = pwd_context.hash("password")
    print("Hash created")
except Exception as e:
    print(f"Error: {e}")
