from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'gothic-archive-secret-key-2024')
JWT_ALGORITHM = "HS256"

# OpenAI Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    role: str
    max_actions: int
    used_actions: int

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"

class KnowledgeBaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    created_at: str
    created_by: str

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    question: str
    answer: str
    created_at: str

class UpdateUserActions(BaseModel):
    max_actions: int

class UpdateUserRole(BaseModel):
    role: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato - Solo admin")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "role": "player",
        "max_actions": 10,
        "used_actions": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, "player")
    user_response = UserResponse(
        id=user_id, email=data.email, username=data.username,
        role="player", max_actions=10, used_actions=0
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"], user["role"])
    user_response = UserResponse(
        id=user["id"], email=user["email"], username=user["username"],
        role=user["role"], max_actions=user["max_actions"], used_actions=user["used_actions"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], username=user["username"],
        role=user["role"], max_actions=user["max_actions"], used_actions=user["used_actions"]
    )

# ==================== KNOWLEDGE BASE ROUTES ====================

@api_router.post("/knowledge", response_model=KnowledgeBaseResponse)
async def create_knowledge(data: KnowledgeBaseCreate, user: dict = Depends(get_admin_user)):
    kb_id = str(uuid.uuid4())
    kb_doc = {
        "id": kb_id,
        "title": data.title,
        "content": data.content,
        "category": data.category,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    return KnowledgeBaseResponse(**kb_doc)

@api_router.get("/knowledge", response_model=List[KnowledgeBaseResponse])
async def get_knowledge(user: dict = Depends(get_current_user)):
    docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(1000)
    return [KnowledgeBaseResponse(**doc) for doc in docs]

@api_router.delete("/knowledge/{kb_id}")
async def delete_knowledge(kb_id: str, user: dict = Depends(get_admin_user)):
    result = await db.knowledge_base.delete_one({"id": kb_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    return {"message": "Documento eliminato"}

@api_router.post("/knowledge/upload")
async def upload_document(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    if not file.filename.endswith(('.txt', '.md')):
        raise HTTPException(status_code=400, detail="Solo file .txt o .md supportati")
    
    content = await file.read()
    text_content = content.decode('utf-8')
    
    kb_id = str(uuid.uuid4())
    kb_doc = {
        "id": kb_id,
        "title": file.filename,
        "content": text_content,
        "category": "uploaded",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    return KnowledgeBaseResponse(**kb_doc)

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def send_chat(data: ChatRequest, user: dict = Depends(get_current_user)):
    # Check action limit
    if user["used_actions"] >= user["max_actions"]:
        raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    # Get knowledge base context
    kb_docs = await db.knowledge_base.find({}, {"_id": 0, "content": 1, "title": 1}).to_list(100)
    context = "\n\n".join([f"### {doc['title']}\n{doc['content']}" for doc in kb_docs])
    
    system_message = f"""Sei un assistente dell'evento. Rispondi alle domande basandoti SOLO sulle informazioni fornite nel contesto seguente. 
Se la domanda non trova risposta nel contesto, dì che non hai informazioni a riguardo.
Rispondi sempre in italiano in modo cortese e utile.

=== CONTESTO DELL'EVENTO ===
{context}
=== FINE CONTESTO ==="""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat-{user['id']}-{uuid.uuid4()}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=data.question)
        answer = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        answer = "Mi dispiace, al momento non riesco a elaborare la tua richiesta. Riprova più tardi."
    
    # Save to chat history
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "user_id": user["id"],
        "question": data.question,
        "answer": answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(chat_doc)
    
    # Update used actions
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"used_actions": 1}}
    )
    
    return ChatResponse(id=chat_id, question=data.question, answer=answer, created_at=chat_doc["created_at"])

@api_router.get("/chat/history", response_model=List[ChatResponse])
async def get_chat_history(user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [ChatResponse(**h) for h in history]

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/admin/users/{user_id}/actions")
async def update_user_actions(user_id: str, data: UpdateUserActions, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"max_actions": data.max_actions}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Azioni aggiornate"}

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, data: UpdateUserRole, admin: dict = Depends(get_admin_user)):
    if data.role not in ["player", "admin"]:
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Ruolo aggiornato"}

@api_router.post("/admin/users/{user_id}/reset-actions")
async def reset_user_actions(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"used_actions": 0}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Azioni resettate"}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "L'Archivio Maledetto API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
