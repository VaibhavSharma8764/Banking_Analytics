from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import csv
import os
import glob
import asyncio
import random
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
import shutil
from database import engine
from etl.run_etl import run_etl
from auth import create_access_token, get_current_user, verify_password, get_password_hash
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


app = FastAPI()
generator_active = False # will show file only if it exists
generator_task = None
TRANSACTION_LIMIT = 1000
OLD_TRANSACTION_DELETE_COUNT = 800




app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL
            )
        """))
        default_users = [
            {"username": "admin", "password": "admin123", "role": "admin"},
            {"username": "operator", "password": "operator123", "role": "operator"},
            {"username": "analyst", "password": "analyst123", "role": "analyst"},
        ]
        for default_user in default_users:
            existing_user = conn.execute(
                text("SELECT id FROM users WHERE username = :username"),
                {"username": default_user["username"]},
            ).fetchone()
            if not existing_user:
                conn.execute(
                    text("INSERT INTO users (username, password, role) VALUES (:username, :password, :role)"),
                    {
                        "username": default_user["username"],
                        "password": get_password_hash(default_user["password"]),
                        "role": default_user["role"],
                    },
                )

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
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_size VARCHAR(20)"))
        except Exception:
            pass
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS upload_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255),
                upload_time TIMESTAMP,
                records_processed INT
            )
        """))
    
    # Enable generator if files or existing transaction data are present.
    global generator_active
    files = glob.glob("temp_*.csv")
    transaction_count = 0
    try:
        with engine.connect() as conn:
            transaction_count = conn.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 0
    except Exception:
        transaction_count = 0

    if files or transaction_count > 0:
        generator_active = True
    else:
        generator_active = False
        
    global generator_task
    if generator_task is None or generator_task.done():
        generator_task = asyncio.create_task(mock_transaction_generator())

@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    username = form_data.username
    password = form_data.password

    query = text("SELECT * FROM users WHERE username = :username")

    with engine.connect() as conn:
        result = conn.execute(query, {"username": username}).fetchone()

    if result and verify_password(password, result[2]):
        token = create_access_token({
            "sub": username,
            "role": result[3]
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": result[3]
        }

    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/guest-login")
def guest_login():
    token = create_access_token({
        "sub": "guest",
        "role": "guest"
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "guest"
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    with engine.begin() as conn:
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

    run_etl(file_path)
    
    filesize = os.path.getsize(file_path)
    mock_records = max(1, filesize // 50) 


    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS upload_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255),
                upload_time TIMESTAMP,
                records_processed INT
            )
        """))
        conn.execute(
            text("INSERT INTO upload_history (filename, upload_time, records_processed) VALUES (:filename, CURRENT_TIMESTAMP, :records)"),
            {"filename": file.filename, "records": mock_records}
        )

    global generator_active
    generator_active = True
    return {"message": "ETL Completed Successfully"}

@app.get("/branch-workload")
def get_branch_workload(user=Depends(get_current_user)):
    query = text("SELECT branch, COUNT(*) as total FROM transactions GROUP BY branch ORDER BY total DESC")
    try:
        with engine.connect() as conn:
            result = conn.execute(query).fetchall()
            return [{"branch": row[0], "total": row[1]} for row in result]
    except Exception as e:
        print(f"Workload Error: {e}")
        return []

@app.get("/transactions")
def get_transactions(type: str = "all", limit: int = 50, user=Depends(get_current_user)):
    base_query = "SELECT * FROM transactions"
    params = {}
    limit = max(1, min(limit, 50))
    
    if type == "failed":
        base_query += " WHERE status = 'failed'"
    elif type == "success":
        base_query += " WHERE status = 'completed' OR status = 'success'"
    elif type == "high-value":
        base_query += " WHERE amount > 3000"
    elif type == "suspicious":
        base_query += " WHERE status = 'failed' AND amount > 2000"
    elif type == "branch-workload":
        pass

    query = text(base_query + " ORDER BY id DESC LIMIT :limit")
    params["limit"] = limit
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, params).fetchall()
            cols = ["id", "transaction_id", "amount", "status", "transaction_date", "branch", "processing_time", "transaction_size"]
            return [dict(zip(cols, row)) for row in result]
    except Exception:
        return []

@app.get("/transactions/count")
def get_transaction_count(type: str = "all", user=Depends(get_current_user)):
    base_query = "SELECT COUNT(*) FROM transactions"

    if type == "failed":
        base_query += " WHERE status = 'failed'"
    elif type == "success":
        base_query += " WHERE status = 'completed' OR status = 'success'"
    elif type == "high-value":
        base_query += " WHERE amount > 3000"
    elif type == "suspicious":
        base_query += " WHERE status = 'failed' AND amount > 2000"

    try:
        with engine.connect() as conn:
            return {"total": conn.execute(text(base_query)).scalar() or 0}
    except Exception:
        return {"total": 0}






class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat_with_data(request: ChatRequest, user=Depends(get_current_user)):
    # Reload env to ensure we have the latest key
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        return {"reply": "Error: Groq API key is missing. Please check your .env file."}
    
    client = Groq(api_key=api_key)
    user_message = request.message
    
    system_prompt = """
    You are a strictly constrained SQL generator for a PostgreSQL database.
    Your task is to generate a valid SQL query to answer the user's question.
    You MUST NOT execute any destructive commands (INSERT, UPDATE, DELETE, DROP, etc). Use ONLY SELECT.
    
    IMPORTANT: If the user asks for a summary, aggregate statistics, or a general overview, use SQL aggregation functions like COUNT(*), SUM(amount), AVG(amount), etc., instead of selecting all rows.
    
    The database has a table named 'transactions' with the following schema:
    - id (INTEGER)
    - transaction_id (VARCHAR)
    - amount (FLOAT)
    - status (VARCHAR) - e.g., 'completed', 'failed', 'pending'
    - transaction_date (VARCHAR)
    - branch (VARCHAR)
    - processing_time (FLOAT)
    - transaction_size (VARCHAR)
    
    If the user asks a question not related to this data, reply exactly with: "OUT_OF_SCOPE".
    Otherwise, reply ONLY with the raw SQL query. Do not wrap it in markdown block quotes (like ```sql), just return the raw text. Ensure the query works on PostgreSQL.
    """
    
    try:
        sql_response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0
        )
        sql_query = sql_response.choices[0].message.content.strip()
        
        if "OUT_OF_SCOPE" in sql_query.upper():
            return {"reply": "I am a financial data assistant. I can only answer questions related to the transactions database."}
            
        sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
        
        if not sql_query.upper().startswith("SELECT"):
            return {"reply": f"Security constraint: Only SELECT queries are permitted. (Generated: {sql_query[:50]}...)"}
            
        with engine.connect() as conn:
            result = conn.execute(text(sql_query))
            # Fetch up to 100 rows to avoid token limit issues in formatting
            rows = result.fetchmany(100)
            columns = list(result.keys())
            data = [dict(zip(columns, row)) for row in rows]
            
            if result.fetchone():
                data.append({"note": "Results truncated to first 100 records for summary."})
            
        format_prompt = f"""
        You are an expert financial data analyst. 
        The user asked: "{user_message}"
        The database returned the following data: {data}
        
        Please provide a concise, natural language answer based ONLY on this data. Make it easy to read. Do not mention that you queried a database.
        """
        
        final_response = client.chat.completions.create(
            messages=[
                {"role": "user", "content": format_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3
        )
        
        return {"reply": final_response.choices[0].message.content.strip()}
        
    except Exception as e:
        print(f"Chat error: {str(e)}")
        return {"reply": f"Sorry, I encountered an error: {str(e)}"}



@app.get("/users")
def get_users(user=Depends(get_current_user)):
    query = "SELECT id, username, role FROM users"
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [{"id": row[0], "username": row[1], "role": row[2], "status": "Active"} for row in result]

@app.post("/add-user")
def add_user(user_data: UserCreate, user=Depends(get_current_user)):
    hashed_password = get_password_hash(user_data.password)
    query = text("INSERT INTO users (username, password, role) VALUES (:username, :password, :role)")
    with engine.begin() as conn:
        conn.execute(query, {"username": user_data.username, "password": hashed_password, "role": user_data.role})
    return {"message": "User added successfully"}

@app.delete("/delete-user/{user_id}")
def delete_user(user_id: int, user=Depends(get_current_user)):
    query = text("DELETE FROM users WHERE id = :id")
    with engine.begin() as conn:
        conn.execute(query, {"id": user_id})
    return {"message": "User deleted successfully"}

@app.get("/admin-stats")
def admin_stats(user=Depends(get_current_user)):
    try:
        with engine.connect() as conn:
            total = conn.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 0
            failed = conn.execute(text("SELECT COUNT(*) FROM transactions WHERE LOWER(status) = 'failed'")).scalar() or 0
            branches = conn.execute(text("SELECT COUNT(DISTINCT branch) FROM transactions")).scalar() or 0
    except Exception:
        total, failed, branches = 0, 0, 0
    
    success_rate = 0
    if total > 0:
        success_rate = round(((total - failed) / total) * 100, 2)
        
    return {
        "total_transactions": total,
        "failed_transactions": failed,
        "success_rate": f"{success_rate}%",
        "total_branches": branches
    }

@app.get("/alerts")
def get_alerts(user=Depends(get_current_user)):
    alerts = []
    try:
        with engine.connect() as conn:
            failed = conn.execute(text("SELECT COUNT(*) FROM transactions WHERE LOWER(status) = 'failed'")).scalar() or 0
            total = conn.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 1
        suspicious = conn.execute(text("SELECT COUNT(*) FROM transactions WHERE LOWER(status) = 'failed' AND amount > 2000")).scalar() or 0
        
        failure_rate = failed / total
        
        if failure_rate > 0.1:
            alerts.append({"type": "High Failure Rate", "message": f"Failure rate is {failure_rate*100:.1f}% (>10%)", "severity": "high"})
        if suspicious > 0:
            alerts.append({"type": "Suspicious Transactions", "message": f"{suspicious} high-value failed transactions detected.", "severity": "high"})
            # third alert
        branches = conn.execute(text("SELECT branch, COUNT(*) as c FROM transactions GROUP BY branch ORDER BY c DESC LIMIT 1")).fetchone()
        if branches and branches[1] > (total * 0.5):
             alerts.append({"type": "Overloaded Branch", "message": f"Branch '{branches[0]}' is handling >50% of traffic.", "severity": "medium"})
        
        if not alerts:
            alerts.append({"type": "System Normal", "message": "All systems operating within acceptable parameters.", "severity": "info"})
    except Exception:
         alerts.append({"type": "Table Missing", "message": "Transaction table has been dropped. Please upload data.", "severity": "info"})
            
    return alerts

@app.get("/export-data")
def export_data(user=Depends(get_current_user)):
    query = "SELECT id, amount, status, branch, processing_time FROM transactions"
    with engine.connect() as conn:
        result = conn.execute(text(query))
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "amount", "status", "branch", "processing_time"])
        for row in result:
            writer.writerow(row)
            
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"}
    )
    
@app.get("/files")
def get_files(user=Depends(get_current_user)):
   
    files = glob.glob("temp_*.csv")
    return [{"filename": f, "size": f"{os.path.getsize(f) / 1024:.1f} KB"} for f in files]

@app.delete("/delete-file/{filename}")
async def delete_file(filename: str, user=Depends(get_current_user)):
    if not filename.startswith("temp_") or not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    if os.path.exists(filename):
        os.remove(filename)

    original_name = filename.replace("temp_", "")
    try:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS transactions"))
            conn.execute(text("DELETE FROM upload_history WHERE filename = :fname"), {"fname": original_name})
    except Exception as e:
        print("Error truncating transactions:", e)
        
    global generator_active
    generator_active = False
    
    await manager.broadcast({"type": "reset_data"})
    
    return {"message": "File deleted and analysis reset successfully"}

@app.get("/upload-history")
def get_upload_history(user=Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS upload_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255),
                upload_time TIMESTAMP,
                records_processed INT
            )
        """))
        result = conn.execute(text("SELECT filename, upload_time, records_processed FROM upload_history ORDER BY upload_time DESC"))
        
        return [
            {"filename": row[0], "upload_time": str(row[1]), "records_processed": row[2]}
            for row in result
        ]

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


def get_recent_transactions(limit: int = 10):
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT transaction_id, amount, status, transaction_date, branch, processing_time, transaction_size
                    FROM transactions
                    ORDER BY id DESC
                    LIMIT :limit
                """),
                {"limit": limit},
            ).fetchall()

        cols = ["transaction_id", "amount", "status", "transaction_date", "branch", "processing_time", "transaction_size"]
        return [dict(zip(cols, row)) for row in result]
    except Exception as e:
        print(f"Recent transaction fetch error: {e}")
        return []


def prune_old_transactions(conn):
    total = conn.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 0
    if total < TRANSACTION_LIMIT:
        return 0

    result = conn.execute(text("""
        DELETE FROM transactions
        WHERE id IN (
            SELECT id
            FROM transactions
            ORDER BY id ASC
            LIMIT :delete_count
        )
    """), {"delete_count": OLD_TRANSACTION_DELETE_COUNT})

    return result.rowcount or OLD_TRANSACTION_DELETE_COUNT

@app.websocket("/ws/transactions")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_json({"type": "recent_transactions", "data": get_recent_transactions()})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def mock_transaction_generator():
    while True:
        await asyncio.sleep(4)
        if not generator_active:
            continue
        
        branches = ['North', 'South', 'East', 'West', 'New York', 'London', 'Tokyo']
        statuses = ['pending', 'completed', 'completed', 'completed', 'failed']
        
        import datetime
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx_id = f"TXN-{random.randint(10000, 99999)}"

        new_tx = {
            "transaction_id": tx_id,
            "amount": round(random.uniform(10, 20000), 2),
            "status": random.choice(statuses),
            "transaction_date": now,
            "branch": random.choice(branches),
            "processing_time": round(random.uniform(0.1, 6.0), 2),
            "transaction_size": "Medium"
        }
        
        try:
            deleted_count = 0
            with engine.begin() as conn:
                conn.execute(
                    text("""
                        INSERT INTO transactions (transaction_id, amount, status, transaction_date, branch, processing_time, transaction_size) 
                        VALUES (:transaction_id, :amount, :status, :transaction_date, :branch, :processing_time, :transaction_size)
                    """),
                    new_tx
                )
                deleted_count = prune_old_transactions(conn)
            await manager.broadcast({"type": "new_transaction", "data": new_tx})
            if deleted_count:
                await manager.broadcast({"type": "transactions_pruned", "deleted": deleted_count})
        except Exception as e:
            print(f"Mock Tx Generator Error: {e}")







