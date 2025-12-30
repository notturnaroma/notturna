from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
import PyPDF2
import io

# Upload directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {
    "text": [".txt", ".md"],
    "pdf": [".pdf"],
    "image": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "video": [".mp4", ".webm", ".mov", ".avi"]
}

def get_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    return "unknown"

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
    file_type: Optional[str] = "text"
    file_url: Optional[str] = None

class KnowledgeBaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    file_type: str
    file_url: Optional[str]
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
    type: Optional[str] = "chat"
    challenge_data: Optional[dict] = None

class UpdateUserActions(BaseModel):
    max_actions: int

class UpdateUserRole(BaseModel):
    role: str

class AppSettings(BaseModel):
    event_name: str = "L'Archivio Maledetto"
    event_logo_url: Optional[str] = None
    primary_color: str = "#8a0000"
    secondary_color: str = "#000033"
    accent_color: str = "#b8860b"
    background_color: str = "#050505"
    hero_title: str = "Svela i Segreti"
    hero_subtitle: str = "dell'Antico Sapere"
    hero_description: str = "Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano."
    chat_placeholder: str = "Poni la tua domanda all'Oracolo..."
    oracle_name: str = "L'Oracolo"
    background_image_url: Optional[str] = None

class AppSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_name: str
    event_logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    hero_title: str
    hero_subtitle: str
    hero_description: str
    chat_placeholder: str
    oracle_name: str
    background_image_url: Optional[str]

# ==================== PROVE LARP MODELS ====================

class ContrastingTest(BaseModel):
    attribute: str  # es. "Intelligenza + Occulto"
    difficulty: int  # es. 7
    success_text: str
    tie_text: str
    failure_text: str

class ChallengeCreate(BaseModel):
    name: str  # es. "Antico tomo sulla scrivania"
    description: str  # Descrizione situazione
    tests: List[ContrastingTest]  # Array di prove contrapposte
    keywords: List[str] = []  # parole chiave per attivare

class ChallengeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    tests: List[dict]
    keywords: List[str]
    created_at: str
    created_by: str

class ChallengeAttempt(BaseModel):
    challenge_id: str
    test_index: int  # quale prova ha scelto (0, 1, 2...)
    player_value: int  # valore attributo del giocatore

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

async def check_monthly_reset(user: dict) -> dict:
    """Reset azioni se è passato un mese dall'ultimo reset"""
    now = datetime.now(timezone.utc)
    last_reset_str = user.get("last_action_reset")
    
    if last_reset_str:
        last_reset = datetime.fromisoformat(last_reset_str.replace('Z', '+00:00'))
        # Controlla se siamo in un mese diverso dall'ultimo reset
        if now.year > last_reset.year or (now.year == last_reset.year and now.month > last_reset.month):
            # Reset mensile
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"used_actions": 0, "last_action_reset": now.isoformat()}}
            )
            user["used_actions"] = 0
            user["last_action_reset"] = now.isoformat()
            logger.info(f"Monthly reset for user {user['id']}")
    else:
        # Se non esiste last_action_reset, lo creiamo
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_action_reset": now.isoformat()}}
        )
        user["last_action_reset"] = now.isoformat()
    
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        # Controlla e applica reset mensile se necessario
        user = await check_monthly_reset(user)
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
    now = datetime.now(timezone.utc)
    user_doc = {
        "id": user_id,
        "email": data.email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "role": "player",
        "max_actions": 10,
        "used_actions": 0,
        "created_at": now.isoformat(),
        "last_action_reset": now.isoformat()
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
        "file_type": data.file_type or "text",
        "file_url": data.file_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    return KnowledgeBaseResponse(**kb_doc)

@api_router.get("/knowledge", response_model=List[KnowledgeBaseResponse])
async def get_knowledge(user: dict = Depends(get_current_user)):
    docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(1000)
    return [KnowledgeBaseResponse(**{**doc, "file_type": doc.get("file_type", "text"), "file_url": doc.get("file_url")}) for doc in docs]

@api_router.delete("/knowledge/{kb_id}")
async def delete_knowledge(kb_id: str, user: dict = Depends(get_admin_user)):
    result = await db.knowledge_base.delete_one({"id": kb_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    return {"message": "Documento eliminato"}

@api_router.post("/knowledge/upload")
async def upload_document(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    """Upload file: testo, PDF, immagini o video"""
    filename = file.filename or "file"
    file_type = get_file_type(filename)
    
    if file_type == "unknown":
        raise HTTPException(
            status_code=400, 
            detail="Tipo file non supportato. Usa: .txt, .md, .pdf, .jpg, .png, .gif, .webp, .mp4, .webm, .mov"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()
    saved_filename = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / saved_filename
    
    # Read file content
    content = await file.read()
    
    # Extract text content based on file type
    text_content = ""
    
    if file_type == "text":
        text_content = content.decode('utf-8')
    elif file_type == "pdf":
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text_parts = []
            for page in pdf_reader.pages:
                text_parts.append(page.extract_text() or "")
            text_content = "\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            text_content = f"[Documento PDF: {filename}]"
    elif file_type in ["image", "video"]:
        text_content = f"[File {file_type}: {filename}]"
    
    # Save file to disk
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # File URL
    file_url = f"/api/uploads/{saved_filename}"
    
    # Save to database
    kb_id = str(uuid.uuid4())
    kb_doc = {
        "id": kb_id,
        "title": filename,
        "content": text_content,
        "category": "uploaded",
        "file_type": file_type,
        "file_url": file_url,
        "file_path": str(file_path),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    
    return KnowledgeBaseResponse(**{k: v for k, v in kb_doc.items() if k != "file_path"})

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(file_path)

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

# ==================== SETTINGS ROUTES ====================

@api_router.get("/settings", response_model=AppSettingsResponse)
async def get_settings():
    """Get app settings (public endpoint for embed)"""
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        # Return defaults
        return AppSettingsResponse(
            event_name="L'Archivio Maledetto",
            event_logo_url=None,
            primary_color="#8a0000",
            secondary_color="#000033",
            accent_color="#b8860b",
            background_color="#050505",
            hero_title="Svela i Segreti",
            hero_subtitle="dell'Antico Sapere",
            hero_description="Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano.",
            chat_placeholder="Poni la tua domanda all'Oracolo...",
            oracle_name="L'Oracolo",
            background_image_url=None
        )
    return AppSettingsResponse(**settings)

@api_router.put("/settings")
async def update_settings(data: AppSettings, user: dict = Depends(get_admin_user)):
    """Update app settings (admin only)"""
    settings_dict = data.model_dump()
    settings_dict["id"] = "app_settings"
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = user["username"]
    
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return {"message": "Impostazioni aggiornate"}

# ==================== CHALLENGES (PROVE LARP) ROUTES ====================

@api_router.post("/challenges", response_model=ChallengeResponse)
async def create_challenge(data: ChallengeCreate, user: dict = Depends(get_admin_user)):
    """Crea una nuova prova LARP"""
    challenge_id = str(uuid.uuid4())
    challenge_doc = {
        "id": challenge_id,
        "name": data.name,
        "description": data.description,
        "tests": [t.model_dump() for t in data.tests],
        "keywords": [k.lower() for k in data.keywords],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.challenges.insert_one(challenge_doc)
    return ChallengeResponse(**challenge_doc)

@api_router.get("/challenges", response_model=List[ChallengeResponse])
async def get_challenges(user: dict = Depends(get_current_user)):
    """Lista tutte le prove"""
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(1000)
    return [ChallengeResponse(**c) for c in challenges]

@api_router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: str, user: dict = Depends(get_admin_user)):
    """Elimina una prova"""
    result = await db.challenges.delete_one({"id": challenge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prova non trovata")
    return {"message": "Prova eliminata"}

@api_router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: str, data: ChallengeCreate, user: dict = Depends(get_admin_user)):
    """Aggiorna una prova"""
    update_doc = {
        "name": data.name,
        "description": data.description,
        "tests": [t.model_dump() for t in data.tests],
        "keywords": [k.lower() for k in data.keywords],
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["username"]
    }
    result = await db.challenges.update_one({"id": challenge_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prova non trovata")
    return {"message": "Prova aggiornata"}

import random

@api_router.post("/challenges/attempt")
async def attempt_challenge(data: ChallengeAttempt, user: dict = Depends(get_current_user)):
    """Tenta una prova - calcola il risultato (una sola volta per utente)"""
    # Check if user already attempted this challenge
    existing_attempt = await db.challenge_attempts.find_one({
        "user_id": user["id"],
        "challenge_id": data.challenge_id
    })
    if existing_attempt:
        raise HTTPException(status_code=403, detail="Hai già tentato questa prova. Non puoi ripeterla.")
    
    # Check action limit
    if user["used_actions"] >= user["max_actions"]:
        raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    challenge = await db.challenges.find_one({"id": data.challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Prova non trovata")
    
    if data.test_index < 0 or data.test_index >= len(challenge["tests"]):
        raise HTTPException(status_code=400, detail="Indice prova non valido")
    
    test = challenge["tests"][data.test_index]
    
    # Calcolo con fattori random
    player_roll = random.randint(1, 5)
    difficulty_roll = random.randint(1, 5)
    
    player_result = data.player_value * player_roll
    difficulty_result = test["difficulty"] * difficulty_roll
    
    # Determina esito
    if player_result > difficulty_result:
        outcome = "success"
        outcome_text = test["success_text"]
    elif player_result == difficulty_result:
        outcome = "tie"
        outcome_text = test["tie_text"]
    else:
        outcome = "failure"
        outcome_text = test["failure_text"]
    
    # Formato output richiesto
    result_message = f"Con il risultato di ({data.player_value}×{player_roll}) {player_result} contro ({test['difficulty']}×{difficulty_roll}) {difficulty_result}: {outcome_text}"
    
    # Salva nel log (questo blocca tentativi futuri)
    attempt_log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "challenge_id": data.challenge_id,
        "challenge_name": challenge["name"],
        "test_index": data.test_index,
        "test_attribute": test["attribute"],
        "player_value": data.player_value,
        "player_roll": player_roll,
        "player_result": player_result,
        "difficulty": test["difficulty"],
        "difficulty_roll": difficulty_roll,
        "difficulty_result": difficulty_result,
        "outcome": outcome,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.challenge_attempts.insert_one(attempt_log)
    
    # Salva anche nell'archivio chat_history per lo storico
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "user_id": user["id"],
        "type": "challenge",
        "question": f"Prova: {challenge['name']} - {test['attribute']}",
        "answer": result_message,
        "challenge_data": {
            "challenge_name": challenge["name"],
            "description": challenge["description"],
            "attribute": test["attribute"],
            "player_value": data.player_value,
            "player_roll": player_roll,
            "player_result": player_result,
            "difficulty": test["difficulty"],
            "difficulty_roll": difficulty_roll,
            "difficulty_result": difficulty_result,
            "outcome": outcome,
            "outcome_text": outcome_text
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(chat_doc)
    
    # Update used actions
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"used_actions": 1}}
    )
    
    return {
        "challenge_name": challenge["name"],
        "attribute": test["attribute"],
        "player_value": data.player_value,
        "player_roll": player_roll,
        "player_result": player_result,
        "difficulty": test["difficulty"],
        "difficulty_roll": difficulty_roll,
        "difficulty_result": difficulty_result,
        "outcome": outcome,
        "message": result_message
    }

@api_router.get("/challenges/my-attempts")
async def get_my_attempts(user: dict = Depends(get_current_user)):
    """Ottieni lista delle prove già tentate dall'utente"""
    attempts = await db.challenge_attempts.find(
        {"user_id": user["id"]},
        {"_id": 0, "challenge_id": 1}
    ).to_list(1000)
    return [a["challenge_id"] for a in attempts]

@api_router.get("/challenges/search")
async def search_challenges(q: str, user: dict = Depends(get_current_user)):
    """Cerca prove per parole chiave"""
    q_lower = q.lower()
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(1000)
    
    matches = []
    for c in challenges:
        # Cerca nelle keywords
        for kw in c.get("keywords", []):
            if kw in q_lower or q_lower in kw:
                matches.append(c)
                break
        else:
            # Cerca nel nome e descrizione
            if q_lower in c["name"].lower() or q_lower in c["description"].lower():
                matches.append(c)
    
    return matches

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
