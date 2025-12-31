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
    # Restrizioni di accesso opzionali
    required_contacts: Optional[List[dict]] = None
    required_mentor: Optional[int] = None
    required_notoriety: Optional[int] = None

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
    required_contacts: Optional[List[dict]] = None
    required_mentor: Optional[int] = None
    required_notoriety: Optional[int] = None

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
    # Hero texts
    hero_title: str = "Svela i Segreti"
    hero_subtitle: str = "dell'Antico Sapere"
    hero_description: str = "Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano."
    # Chat texts
    chat_placeholder: str = "Poni la tua domanda all'Oracolo..."
    oracle_name: str = "L'Oracolo"
    chat_waiting_message: str = "è in attesa"
    chat_loading_message: str = "Consulto gli antichi tomi..."
    # Navigation texts
    nav_archive: str = "ARCHIVIO"
    nav_admin: str = "ADMIN"
    nav_logout: str = "ESCI"
    nav_aids: str = "FOCALIZZAZIONI"
    nav_background: str = "BACKGROUND"
    nav_background: str = "BACKGROUND"
    # Aids/Focalizzazioni texts
    aids_title: str = "Focalizzazioni degli Attributi"
    aids_subtitle: str = "Inserisci il valore del tuo attributo per vedere le focalizzazioni disponibili"
    aids_no_active: str = "Nessuna focalizzazione attiva in questo momento"
    aids_no_active_desc: str = "Le focalizzazioni sono disponibili solo durante gli eventi dal vivo"
    aids_obtained: str = "Focalizzazione Ottenuta"
    aids_input_label: str = "Inserisci il tuo valore di"
    # Challenge texts
    challenge_title: str = "Prova Richiesta"
    challenge_success: str = "Successo!"
    challenge_tie: str = "Parità"
    challenge_failure: str = "Fallimento"
    challenge_roll_btn: str = "LANCIA I DADI"
    # Archive texts
    archive_title: str = "Le Tue Consultazioni"
    archive_select: str = "Seleziona una consultazione"
    archive_select_desc: str = "Clicca su una delle tue domande passate per visualizzare i dettagli della consultazione."
    # Actions texts
    actions_exhausted: str = "Hai esaurito le tue azioni disponibili"
    # Auth texts  
    auth_login_title: str = "Accedi"
    auth_register_title: str = "Registrati"
    auth_login_btn: str = "ENTRA NELL'ARCHIVIO"
    auth_register_btn: str = "UNISCITI ALL'ARCHIVIO"
    # Landing texts
    landing_cta: str = "INIZIA IL TUO VIAGGIO"
    landing_feature1_title: str = "Interroga l'Oracolo"
    landing_feature1_desc: str = "Poni le tue domande all'intelligenza arcana che custodisce le conoscenze dell'evento."
    landing_feature2_title: str = "Archivio Personale"
    landing_feature2_desc: str = "Ogni tua domanda e risposta viene conservata nel tuo archivio personale per futura consultazione."
    landing_feature3_title: str = "Azioni Limitate"
    landing_feature3_desc: str = "Ogni giocatore ha un numero limitato di azioni. Usa saggiamente il tuo potere di interrogazione."
    background_image_url: Optional[str] = None
    # Finestra temporale macro evento live (opzionale)
    event_window_start: Optional[str] = None
    event_window_end: Optional[str] = None

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
    chat_waiting_message: Optional[str] = "è in attesa"
    chat_loading_message: Optional[str] = "Consulto gli antichi tomi..."
    nav_archive: Optional[str] = "ARCHIVIO"
    nav_admin: Optional[str] = "ADMIN"
    nav_logout: Optional[str] = "ESCI"
    nav_aids: Optional[str] = "FOCALIZZAZIONI"
    nav_background: Optional[str] = "BACKGROUND"
    nav_background: Optional[str] = "BACKGROUND"
    aids_title: Optional[str] = "Focalizzazioni degli Attributi"
    aids_subtitle: Optional[str] = "Inserisci il valore del tuo attributo per vedere le focalizzazioni disponibili"
    aids_no_active: Optional[str] = "Nessuna focalizzazione attiva in questo momento"
    aids_no_active_desc: Optional[str] = "Le focalizzazioni sono disponibili solo durante gli eventi dal vivo"
    aids_obtained: Optional[str] = "Focalizzazione Ottenuta"
    aids_input_label: Optional[str] = "Inserisci il tuo valore di"
    challenge_title: Optional[str] = "Prova Richiesta"
    challenge_success: Optional[str] = "Successo!"
    challenge_tie: Optional[str] = "Parità"
    challenge_failure: Optional[str] = "Fallimento"
    challenge_roll_btn: Optional[str] = "LANCIA I DADI"
    archive_title: Optional[str] = "Le Tue Consultazioni"
    archive_select: Optional[str] = "Seleziona una consultazione"
    archive_select_desc: Optional[str] = "Clicca su una delle tue domande passate per visualizzare i dettagli della consultazione."
    actions_exhausted: Optional[str] = "Hai esaurito le tue azioni disponibili"
    auth_login_title: Optional[str] = "Accedi"
    auth_register_title: Optional[str] = "Registrati"
    auth_login_btn: Optional[str] = "ENTRA NELL'ARCHIVIO"
    auth_register_btn: Optional[str] = "UNISCITI ALL'ARCHIVIO"
    landing_cta: Optional[str] = "INIZIA IL TUO VIAGGIO"
    landing_feature1_title: Optional[str] = "Interroga l'Oracolo"
    landing_feature1_desc: Optional[str] = "Poni le tue domande all'intelligenza arcana che custodisce le conoscenze dell'evento."
    landing_feature2_title: Optional[str] = "Archivio Personale"
    landing_feature2_desc: Optional[str] = "Ogni tua domanda e risposta viene conservata nel tuo archivio personale per futura consultazione."
    landing_feature3_title: Optional[str] = "Azioni Limitate"
    landing_feature3_desc: Optional[str] = "Ogni giocatore ha un numero limitato di azioni. Usa saggiamente il tuo potere di interrogazione."
    background_image_url: Optional[str]
    event_window_start: Optional[str] = None
    event_window_end: Optional[str] = None

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
    allow_refuge_defense: bool = False  # se true, il rifugio può ridurre la difficoltà

class ChallengeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    tests: List[dict]
    keywords: List[str]
    allow_refuge_defense: bool = False
    created_at: str
    created_by: str

class ChallengeAttempt(BaseModel):
    challenge_id: str
    test_index: int  # quale prova ha scelto (0, 1, 2...)
    player_value: int  # valore attributo del giocatore
    use_refuge: bool = False  # se il PG vuole usare il proprio rifugio difensivo
    followers_to_use: int = 0  # quanti punti SEGUACI il PG vuole usare per questa prova

class BackgroundContact(BaseModel):
    name: str
    value: int

class Background(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    risorse: int = 0
    seguaci: int = 0
    rifugio: int = 1
    mentor: int = 0
    notoriety: int = 0
    contacts: List[BackgroundContact] = []
    locked_for_player: bool = False

# ==================== AIUTI ATTRIBUTO MODELS ====================
# ==================== RISORSE & SEGUACI SUPPORT ====================

class ResourceItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cost_resources: int = 1
    block_until: Optional[str] = None  # ISO datetime (opzionale)

class ResourceItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    cost_resources: int
    block_until: Optional[str] = None

class ResourceAvailableResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    total_resources: int
    locked_resources: int
    available_resources: int
    items: List[ResourceItemResponse]

class ResourcePurchaseRequest(BaseModel):
    item_id: str
class FollowerStatus(BaseModel):
    total_followers: int
    spent_followers: int
    available_followers: int
    remaining_actions_before: int





class AidLevel(BaseModel):
    level: int  # 2, 4, o 5
    level_name: str  # "minore", "medio", "maggiore"
    text: str  # testo dell'aiuto

class AidCreate(BaseModel):
    name: str  # es. "Collegamento Intelligenza"
    attribute: str  # es. "Intelligenza"
    levels: List[AidLevel]  # array di livelli con testi
    event_date: str  # data inizio (YYYY-MM-DD)
    end_date: Optional[str] = None  # data fine (YYYY-MM-DD), opzionale
    start_time: str  # ora inizio (HH:MM)
    end_time: str  # ora fine (HH:MM)

class AidResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    attribute: str
    levels: List[dict]
    event_date: str
    end_date: Optional[str] = None
    start_time: str
    end_time: str
    created_at: str
    created_by: str

class UseAid(BaseModel):
    aid_id: str
    level: int  # quale livello sta usando (2, 4 o 5)
    player_attribute_value: int  # valore attributo del giocatore

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

def get_month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")

async def get_follower_spent_this_month(user_id: str) -> int:
    """Somma dei punti SEGUACI spesi in questo mese"""
    now = datetime.now(timezone.utc)
    month_key = get_month_key(now)
    spends = await db.follower_spends.find({
        "user_id": user_id,
        "month_key": month_key
    }, {"_id": 0, "amount": 1}).to_list(1000)
    return sum(int(s.get("amount", 0)) for s in spends)

async def get_effective_max_actions(user: dict) -> int:
    """Calcola il limite effettivo di consultazioni per il mese corrente (20 + SEGUACI - SEGUACI_spesi)."""
    base_max = int(user.get("max_actions", 20))
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "seguaci": 1}) or {}
    seguaci = int(bg.get("seguaci", 0))
    spent = await get_follower_spent_this_month(user["id"])
    return max(0, base_max + seguaci - spent)


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
@api_router.get("/followers/status", response_model=FollowerStatus)
async def get_follower_status(current_user: UserResponse = Depends(get_current_user)):
    """Ritorna la situazione dei SEGUACI per il mese corrente"""
    user = current_user.model_dump()
    effective_max = await get_effective_max_actions(user)
    remaining_before = max(0, effective_max - user["used_actions"])

    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "seguaci": 1}) or {}
    total_followers = int(bg.get("seguaci", 0))
    spent_followers = await get_follower_spent_this_month(user["id"])
    available_followers = max(0, total_followers - spent_followers)

    return FollowerStatus(
        total_followers=total_followers,
        spent_followers=spent_followers,
        available_followers=available_followers,
        remaining_actions_before=remaining_before
    )


    
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
        "max_actions": 20,
        "used_actions": 0,
        "created_at": now.isoformat(),
        "last_action_reset": now.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, "player")
    user_response = UserResponse(
        id=user_id, email=data.email, username=data.username,
        role="player", max_actions=20, used_actions=0
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
        "required_contacts": data.required_contacts or [],
        "required_mentor": data.required_mentor,
        "required_notoriety": data.required_notoriety,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    return KnowledgeBaseResponse(**kb_doc)

@api_router.get("/knowledge", response_model=List[KnowledgeBaseResponse])
async def get_knowledge(user: dict = Depends(get_current_user)):
    docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(1000)
    return [KnowledgeBaseResponse(**{
        **doc,
        "file_type": doc.get("file_type", "text"),
        "file_url": doc.get("file_url"),
        "required_contacts": doc.get("required_contacts"),
        "required_mentor": doc.get("required_mentor"),
        "required_notoriety": doc.get("required_notoriety"),
    }) for doc in docs]

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
    # Check action limit (usa limite effettivo 20 + SEGUACI - SEGUACI_spesi)
    effective_max = await get_effective_max_actions(user)
    if user["used_actions"] >= effective_max:
        raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    # Recupera background del PG per filtrare in base ai requisiti
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    def has_required_contacts(doc, background):
        required = doc.get("required_contacts") or []
        if not required:
            return True
        contacts_map = {c["name"].lower(): c["value"] for c in (background.get("contacts") or [])}
        for req in required:
            name = str(req.get("name", "")).lower()
            min_val = int(req.get("value", 0))
            if not name:
                continue
            if contacts_map.get(name, 0) < min_val:
                return False
        return True

    def has_required_background(doc, background):
        # Mentor
        req_mentor = doc.get("required_mentor")
        if req_mentor is not None and (background.get("mentor", 0) < req_mentor):
            return False
        # Notoriety
        req_notoriety = doc.get("required_notoriety")
        if req_notoriety is not None and (background.get("notoriety", 0) < req_notoriety):
            return False
        # Contacts
        if not has_required_contacts(doc, background):
            return False
        return True

    # Get knowledge base context
    kb_docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(100)
    
    # Filtra i documenti KB in base al background del PG
    kb_docs = [doc for doc in kb_docs if has_required_background(doc, bg)]
    context = "\n\n".join([f"### {doc['title']}\n{doc['content']}" for doc in kb_docs])
    
    system_message = f"""Sei l'Oracolo di un live action role‑playing game (LARP) ambientato in Vampire: The Masquerade.
Tutte le domande che ricevi sono **in gioco** e riguardano personaggi e situazioni di finzione.
Non stai dando consigli reali, ma solo risposte narrative per un gioco.

Linee guida di tono e stile:
- Rispondi SEMPRE in italiano.
- Mantieni un tono oscuro, gotico, cinico, talvolta crudele, in linea con il Mondo di Tenebra.
- Non fare prediche morali: descrivi e suggerisci opzioni in‑game senza giudicare i personaggi.
- Puoi parlare di violenza, sangue, fanatismo, corruzione, manipolazione, setta, potere, ecc. **solo come elementi narrativi**.
- Se una richiesta si avvicina troppo a istruzioni pratiche per far male nel mondo reale, rispondi in modo vago e simbolico, mantenendo l'atmosfera horror, senza mai dare istruzioni concrete.
- Se non trovi risposta nel contesto, ammettilo in stile in‑game (es. "L'Oracolo non vede oltre questo velo di tenebra su questo punto") invece di messaggi tecnici.

Basati SOLO sulle informazioni fornite nel contesto seguente.

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
    ).sort("created_at", -1).to_list(1000)
    return [ChatResponse(
        id=h["id"],
        question=h["question"],
        answer=h["answer"],
        created_at=h["created_at"],
        type=h.get("type", "chat"),
        challenge_data=h.get("challenge_data")
    ) for h in history]

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

@api_router.post("/admin/users/reset-max-actions")
async def reset_all_users_max_actions(admin: dict = Depends(get_admin_user)):
    """Imposta max_actions=20 per tutti i PG esistenti"""
    await db.users.update_many({}, {"$set": {"max_actions": 20}})
    return {"message": "max_actions impostato a 20 per tutti gli utenti"}


@api_router.get("/background/me", response_model=Background)
async def get_my_background(user: dict = Depends(get_current_user)):
    doc = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        # Ritorna un background vuoto non lockato (valori di default)
        return Background(user_id=user["id"])
    return Background(**doc)

@api_router.post("/background/me", response_model=Background)
async def create_or_update_my_background(data: Background, user: dict = Depends(get_current_user)):
    # Trova background esistente
    existing = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing and existing.get("locked_for_player", False):
        raise HTTPException(status_code=403, detail="Il tuo background può essere modificato solo dalla Narrazione")

    # Vincoli lato PG: valori entro range
    if not (0 <= data.risorse <= 20):
        raise HTTPException(status_code=400, detail="RISORSE deve essere tra 0 e 20")
    if not (0 <= data.seguaci <= 5):
        raise HTTPException(status_code=400, detail="SEGUACI deve essere tra 0 e 5")
    if not (1 <= data.rifugio <= 5):
        raise HTTPException(status_code=400, detail="RIFUGIO deve essere tra 1 e 5")
    if not (0 <= data.mentor <= 5):
        raise HTTPException(status_code=400, detail="MENTORE deve essere tra 0 e 5")
    if not (0 <= data.notoriety <= 5):
        raise HTTPException(status_code=400, detail="NOTORIETÀ deve essere tra 0 e 5")

    # Contatti: ogni valore 1-5, somma <= 20
    total_contacts = 0
    for c in data.contacts:
        if not (1 <= c.value <= 5):
            raise HTTPException(status_code=400, detail="Ogni contatto deve avere un valore tra 1 e 5")
        total_contacts += c.value
    if total_contacts > 20:
        raise HTTPException(status_code=400, detail="La somma dei punti contatti non può superare 20")

    doc = data.model_dump()
    doc["user_id"] = user["id"]
    doc["locked_for_player"] = True

    await db.backgrounds.update_one(
        {"user_id": user["id"]},
        {"$set": doc},
        upsert=True
    )
    return Background(**doc)

@api_router.get("/admin/background/{user_id}", response_model=Background)
@api_router.post("/resources", response_model=ResourceItemResponse)
async def create_resource_item(data: ResourceItemCreate, admin: dict = Depends(get_admin_user)):
    if data.cost_resources <= 0:
        raise HTTPException(status_code=400, detail="Il costo in RISORSE deve essere almeno 1")

    item_id = str(uuid.uuid4())
    doc = {
        "id": item_id,
        "name": data.name,
        "description": data.description,
        "cost_resources": data.cost_resources,
        "block_until": data.block_until
    }
    await db.resource_items.insert_one(doc)
    return ResourceItemResponse(**doc)

@api_router.get("/resources", response_model=List[ResourceItemResponse])
async def list_resource_items(admin: dict = Depends(get_admin_user)):
    docs = await db.resource_items.find({}, {"_id": 0}).to_list(1000)
    return [ResourceItemResponse(**d) for d in docs]

@api_router.get("/resources/available", response_model=ResourceAvailableResponse)
async def get_available_resources(user: dict = Depends(get_current_user)):
    # RISORSE totali dal background
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "risorse": 1}) or {}
    total = int(bg.get("risorse", 0))
    now = datetime.now(timezone.utc)
    # Somma dei lock attivi
    locks = await db.resource_locks.find({
        "user_id": user["id"],
        "unlock_at": {"$gt": now.isoformat()}
    }, {"_id": 0, "amount": 1}).to_list(1000)
    locked = sum(int(lock.get("amount", 0)) for lock in locks)
    available = max(0, total - locked)

    items_docs = await db.resource_items.find({}, {"_id": 0}).to_list(1000)
    items = [ResourceItemResponse(**d) for d in items_docs]

    return ResourceAvailableResponse(
        total_resources=total,
        locked_resources=locked,
        available_resources=available,
        items=items
    )

@api_router.post("/resources/purchase", response_model=ResourceAvailableResponse)
async def purchase_resource(req: ResourcePurchaseRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    # Trova oggetto
    item = await db.resource_items.find_one({"id": req.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Oggetto non trovato")

    cost = int(item.get("cost_resources", 0))
    if cost <= 0:
        raise HTTPException(status_code=400, detail="Costo RISORSE non valido")

    # Calcola RISORSE disponibili
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "risorse": 1}) or {}
    total = int(bg.get("risorse", 0))

    locks = await db.resource_locks.find({
        "user_id": user["id"],
        "unlock_at": {"$gt": now.isoformat()}
    }, {"_id": 0, "amount": 1}).to_list(1000)
    locked = sum(int(lock.get("amount", 0)) for lock in locks)
    available = max(0, total - locked)

    if available < cost:
        raise HTTPException(status_code=403, detail="Non hai RISORSE sufficienti per questo acquisto")

    # Calcola unlock_at: se l'oggetto ha block_until, usa quello, altrimenti primo giorno del mese successivo
    block_until = item.get("block_until")
    if block_until:
        unlock_at = block_until
    else:
        # Primo giorno del mese successivo
        year = now.year + (1 if now.month == 12 else 0)
        month = 1 if now.month == 12 else now.month + 1
        unlock_date = datetime(year, month, 1, tzinfo=timezone.utc)
        unlock_at = unlock_date.isoformat()

    lock_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "item_id": item["id"],
        "amount": cost,
        "locked_at": now.isoformat(),
        "unlock_at": unlock_at
    }
    await db.resource_locks.insert_one(lock_doc)

    # Ritorna stato aggiornato
    return await get_available_resources(user)


async def get_user_background(user_id: str, admin: dict = Depends(get_admin_user)):
    doc = await db.backgrounds.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return Background(user_id=user_id)
    return Background(**doc)

@api_router.put("/admin/background/{user_id}", response_model=Background)
async def update_user_background(user_id: str, data: Background, admin: dict = Depends(get_admin_user)):
    # L'admin può modificare liberamente, anche oltre i limiti
    doc = data.model_dump()
    doc["user_id"] = user_id
    doc["locked_for_player"] = True
    await db.backgrounds.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    return Background(**doc)


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Elimina completamente un PG (utente)"""
    # Non permettere di cancellare se stessi per sicurezza
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")

    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    # TODO: opzionale - pulire dati correlati (chat_history, background, ecc.)
    return {"message": "Utente eliminato"}


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
        "allow_refuge_defense": data.allow_refuge_defense,
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
        "allow_refuge_defense": data.allow_refuge_defense,
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
    
    # Check action limit (usa limite effettivo 20 + SEGUACI - SEGUACI_spesi)
    effective_max = await get_effective_max_actions(user)
    if user["used_actions"] >= effective_max:
        raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    challenge = await db.challenges.find_one({"id": data.challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Prova non trovata")
    
    if data.test_index < 0 or data.test_index >= len(challenge["tests"]):
        raise HTTPException(status_code=400, detail="Indice prova non valido")
    
    test = challenge["tests"][data.test_index]
    
    # Eventuale uso del rifugio per ridurre la difficoltà
    refuge_bonus = 0
    if challenge.get("allow_refuge_defense") and data.use_refuge:
        # Recupera background del PG
        bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "rifugio": 1})
        rifugio = (bg or {}).get("rifugio", 1)
        if rifugio <= 1:
            refuge_bonus = 0
        elif rifugio in [2, 3]:
            refuge_bonus = 1
        elif rifugio == 4:
            refuge_bonus = 2
        else:  # 5 o più
            refuge_bonus = 3
    # Eventuale uso dei SEGUACI per ridurre ulteriormente la difficoltà
    followers_used = 0
    # Calcola quante consultazioni rimangono (prima del tentativo corrente)
    remaining_before = effective_max - user["used_actions"]
    if remaining_before < 0:
        remaining_before = 0

    # Leggi eventuali SEGUACI dal background
    # Registra l'uso dei SEGUACI, se presente
    if followers_used > 0:
        now = datetime.now(timezone.utc)
        spend_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "amount": followers_used,
            "month_key": get_month_key(now),
            "created_at": now.isoformat()
        }
        await db.follower_spends.insert_one(spend_doc)


    bg_full = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0, "seguaci": 1}) or {}
    total_followers = int(bg_full.get("seguaci", 0))
    spent_followers = await get_follower_spent_this_month(user["id"])
    followers_available = max(0, total_followers - spent_followers)

    # followers_to_use arriva dal frontend
    followers_to_use = max(0, int(getattr(data, "followers_to_use", 0)))
    if followers_to_use < 0:
        followers_to_use = 0

    # Non si possono usare più SEGUACI di quelli disponibili
    followers_to_use = min(followers_to_use, followers_available)

    # Non si possono usare SEGUACI che porterebbero le consultazioni sotto 0
    if followers_to_use > remaining_before:
        followers_to_use = remaining_before

    # Applica il contributo dei SEGUACI alla difficoltà (ogni punto = -1 difficoltà)
    if followers_to_use > 0:
        followers_used = followers_to_use


    
    # Calcolo con fattori random
    player_roll = random.randint(1, 5)
    difficulty_roll = random.randint(1, 5)
    
    player_result = data.player_value * player_roll
    # Applica bonus difensivo del rifugio e contributo dei SEGUACI riducendo la difficoltà effettiva
    effective_difficulty = max(0, test["difficulty"] - refuge_bonus - followers_used)
    difficulty_result = effective_difficulty * difficulty_roll
    
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

# ==================== AIDS (AIUTI ATTRIBUTO) ROUTES ====================

def is_aid_active(event_date_str: str, start_time_str: str = "00:00", end_time_str: str = "23:59", end_date_str: Optional[str] = None) -> bool:
    """Controlla se l'aiuto è attivo (data/e e orario), supportando un intervallo data inizio/fine"""
    from datetime import timedelta
    try:
        event_start_date = datetime.strptime(event_date_str, "%Y-%m-%d")
        # Se non viene fornita end_date, usiamo la stessa data di inizio
        event_end_date = datetime.strptime(end_date_str, "%Y-%m-%d") if end_date_str else event_start_date
        now = datetime.now()
        
        # Parse orari
        start_h, start_m = map(int, start_time_str.split(":"))
        end_h, end_m = map(int, end_time_str.split(":"))
        
        # Costruisci finestre start/end sul primo e sull'ultimo giorno
        start_dt = event_start_date.replace(hour=start_h, minute=start_m)
        # Se l'orario di fine attraversa la mezzanotte, estendiamo di un giorno rispetto a event_end_date
        if end_h < start_h:
            end_dt = (event_end_date + timedelta(days=1)).replace(hour=end_h, minute=end_m)
        else:
            end_dt = event_end_date.replace(hour=end_h, minute=end_m)
        
        return start_dt <= now <= end_dt
    except Exception as e:
        logger.error(f"Error checking aid active: {e}")
        return False

@api_router.post("/aids", response_model=AidResponse)
async def create_aid(data: AidCreate, user: dict = Depends(get_admin_user)):
    """Crea una nuova focalizzazione attributo"""
    aid_id = str(uuid.uuid4())
    aid_doc = {
        "id": aid_id,
        "name": data.name,
        "attribute": data.attribute,
        "levels": [level.model_dump() for level in data.levels],
        "event_date": data.event_date,
        "end_date": data.end_date,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.aids.insert_one(aid_doc)
    return AidResponse(**aid_doc)

@api_router.get("/aids", response_model=List[AidResponse])
async def get_aids(user: dict = Depends(get_current_user)):
    """Lista tutte le focalizzazioni"""
    aids = await db.aids.find({}, {"_id": 0}).to_list(1000)
    return [AidResponse(**{**a, "start_time": a.get("start_time", "00:00"), "end_time": a.get("end_time", "23:59"), "end_date": a.get("end_date")}) for a in aids]

@api_router.get("/aids/active", response_model=List[AidResponse])
async def get_active_aids(user: dict = Depends(get_current_user)):
    """Lista solo le focalizzazioni attive (data e orario validi)"""
    aids = await db.aids.find({}, {"_id": 0}).to_list(1000)
    active = [
        AidResponse(**{**a, "start_time": a.get("start_time", "00:00"), "end_time": a.get("end_time", "23:59"), "end_date": a.get("end_date")}) 
        for a in aids 
        if is_aid_active(a["event_date"], a.get("start_time", "00:00"), a.get("end_time", "23:59"), a.get("end_date"))
    ]
    return active

@api_router.delete("/aids/{aid_id}")
async def delete_aid(aid_id: str, user: dict = Depends(get_admin_user)):
    """Elimina un aiuto"""
    result = await db.aids.delete_one({"id": aid_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aiuto non trovato")
    return {"message": "Aiuto eliminato"}

@api_router.put("/aids/{aid_id}")
async def update_aid(aid_id: str, data: AidCreate, user: dict = Depends(get_admin_user)):
    """Aggiorna una focalizzazione"""
    update_doc = {
        "name": data.name,
        "attribute": data.attribute,
        "levels": [level.model_dump() for level in data.levels],
        "event_date": data.event_date,
        "end_date": data.end_date,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["username"]
    }
    result = await db.aids.update_one({"id": aid_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Focalizzazione non trovata")
    return {"message": "Focalizzazione aggiornata"}

@api_router.get("/aids/my-used")
async def get_my_used_aids(user: dict = Depends(get_current_user)):
    """Ottieni lista degli aiuti già usati dall'utente (aid_id + level)"""
    used = await db.aid_uses.find(
        {"user_id": user["id"]},
        {"_id": 0, "aid_id": 1, "level": 1}
    ).to_list(1000)
    return used

@api_router.post("/aids/use")
async def use_aid(data: UseAid, user: dict = Depends(get_current_user)):
    """Usa un aiuto - verifica attributo e data"""
    
    # Check action limit (usa limite effettivo 20 + SEGUACI - SEGUACI_spesi)
    effective_max = await get_effective_max_actions(user)
    if user["used_actions"] >= effective_max:
        raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    # Trova l'aiuto
    aid = await db.aids.find_one({"id": data.aid_id}, {"_id": 0})
    if not aid:
        raise HTTPException(status_code=404, detail="Aiuto non trovato")
    
    # Verifica data e orario attivi
    if not is_aid_active(aid["event_date"], aid.get("start_time", "00:00"), aid.get("end_time", "23:59"), aid.get("end_date")):
        raise HTTPException(status_code=403, detail="Questo aiuto non è attivo in questo momento. Controlla data e orario dell'evento.")
    
    # Verifica se già usato questo livello
    existing = await db.aid_uses.find_one({
        "user_id": user["id"],
        "aid_id": data.aid_id,
        "level": data.level
    })
    if existing:
        raise HTTPException(status_code=403, detail="Hai già utilizzato questo aiuto a questo livello.")
    
    # Verifica attributo sufficiente
    if data.player_attribute_value < data.level:
        raise HTTPException(
            status_code=403, 
            detail=f"Il tuo valore di {aid['attribute']} ({data.player_attribute_value}) è insufficiente per questo livello ({data.level})."
        )
    
    # Trova il livello richiesto
    level_data = None
    for level in aid["levels"]:
        if level["level"] == data.level:
            level_data = level
            break
    
    if not level_data:
        raise HTTPException(status_code=400, detail="Livello non trovato per questo aiuto")
    
    # Salva l'uso
    use_log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "aid_id": data.aid_id,
        "aid_name": aid["name"],
        "attribute": aid["attribute"],
        "level": data.level,
        "level_name": level_data["level_name"],
        "player_value": data.player_attribute_value,
        "text": level_data["text"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.aid_uses.insert_one(use_log)
    
    # Salva nell'archivio chat_history
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "user_id": user["id"],
        "type": "aid",
        "question": f"Aiuto: {aid['name']} - {aid['attribute']} (Livello {level_data['level_name']})",
        "answer": level_data["text"],
        "aid_data": {
            "aid_name": aid["name"],
            "attribute": aid["attribute"],
            "level": data.level,
            "level_name": level_data["level_name"],
            "player_value": data.player_attribute_value,
            "text": level_data["text"]
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
        "aid_name": aid["name"],
        "attribute": aid["attribute"],
        "level": data.level,
        "level_name": level_data["level_name"],
        "text": level_data["text"],
        "message": f"Hai ottenuto l'aiuto {level_data['level_name']} di {aid['attribute']}: {level_data['text']}"
    }

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
