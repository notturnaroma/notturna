import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import bcrypt
import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from sheets import fetch_sheet, map_sheet_to_background, build_sheet_context

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'gothic-archive-secret-key-2024')
JWT_ALGORITHM = "HS256"

# OpenAI Config
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("archivio")

# ==================== CONOSCENZE & TRIMESTRI ====================

KNOWLEDGE_MAP = {
    "Accademiche classiche": ["espressione artistica", "finanza", "legge", "politica", "storia"],
    "Criminalità": ["bassifondi", "delinquenza", "mercato nero", "sistemi di allarme", "sotterfugio"],
    "Etichetta": ["alta società", "burocrazia", "consapevolezza", "diplomazia", "galateo"],
    "Militari": ["esercito", "investigare", "scene del crimine", "sopravvivenza", "stealth"],
    "Occulto": ["folklore e superstizione", "mondo oscuro", "religioni", "sesto senso", "stregoneria e rituali"],
    "Scienze": ["hacking", "informatica", "medicina", "smfn", "tecnologia"],
}
KNOWLEDGE_TYPES = list(KNOWLEDGE_MAP.keys())

def derive_knowledge_from_attribute(attribute: str) -> str:
    """Deriva la tipologia di conoscenze dal testo della caratteristica (es. 'Intelligenza + Storia' -> Accademiche classiche)."""
    text = (attribute or "").lower()
    for category, subs in KNOWLEDGE_MAP.items():
        if category.lower() in text:
            return category
        for sub in subs:
            if sub in text:
                return category
    return ""

def quarter_key(dt: datetime) -> str:
    """Trimestri ancorati a Settembre: Set-Ott-Nov, Dic-Gen-Feb, Mar-Apr-Mag, Giu-Lug-Ago."""
    m, y = dt.month, dt.year
    if m in (9, 10, 11):
        return f"{y}-SET"
    if m == 12:
        return f"{y}-DIC"
    if m in (1, 2):
        return f"{y - 1}-DIC"
    if m in (3, 4, 5):
        return f"{y}-MAR"
    return f"{y}-GIU"

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
    """Calcola il limite effettivo di consultazioni per il mese corrente (10 + SEGUACI - SEGUACI_spesi)."""
    base_max = int(user.get("max_actions", 10))
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
    
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        if user.get("blocked"):
            raise HTTPException(status_code=403, detail="Account bloccato dalla Narrazione")
        # Controlla e applica reset mensile se necessario
        user = await check_monthly_reset(user)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin", "Narrazione"]:
        raise HTTPException(status_code=403, detail="Accesso negato - Solo admin")
    return user

async def get_target_for_admin_action(user_id: str, admin: dict) -> dict:
    """Verifica gerarchia Narrazione: solo NARRAZIONE ITALIA (super admin) può agire su altri account admin."""
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["id"] != admin["id"]:
        if target.get("is_super_admin"):
            raise HTTPException(status_code=403, detail="L'account NARRAZIONE ITALIA non può essere modificato da altri account")
        if target.get("role") in ["admin", "Narrazione"] and not admin.get("is_super_admin"):
            raise HTTPException(status_code=403, detail="Solo NARRAZIONE ITALIA può gestire gli altri account Narrazione")
        if not admin.get("is_super_admin"):
            admin_region = admin.get("region")
            target_region = target.get("region")
            if admin_region and target_region and target_region != admin_region:
                raise HTTPException(status_code=403, detail=f"Puoi modificare solo i giocatori della tua regione ({admin_region})")
    return target

def check_kb_region_rights(admin: dict, region: str):
    """Un admin regionale può gestire solo documenti della propria regione o Nazionali."""
    if admin.get("is_super_admin"):
        return
    allowed = {"Nazionale"}
    if admin.get("region"):
        allowed.add(admin["region"])
    if region not in allowed:
        raise HTTPException(status_code=403, detail="Puoi gestire solo documenti della tua regione o Nazionali")

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
    req_mentor = doc.get("required_mentor")
    if req_mentor is not None and (background.get("mentor", 0) < req_mentor):
        return False
    req_notoriety = doc.get("required_notoriety")
    if req_notoriety is not None and (background.get("notoriety", 0) < req_notoriety):
        return False
    if not has_required_contacts(doc, background):
        return False
    return True

def is_doc_visible_to_player(doc, bg, user):
    """Visibilità documento KB per un giocatore: regione + FAMA (nazionali) + requisiti background."""
    doc_region = doc.get("region") or "Nazionale"
    if doc_region == "Nazionale":
        rfv = doc.get("required_fama_vampiri")
        if rfv is not None and int(bg.get("fama_vampiri", 0)) < int(rfv):
            return False
        rfm = doc.get("required_fama_mondo_oscuro")
        if rfm is not None and int(bg.get("fama_mondo_oscuro", 0)) < int(rfm):
            return False
    else:
        if user.get("region") and doc_region != user["region"]:
            return False
    return has_required_background(doc, bg)

def extract_relevant_excerpts(content: str, search_words: set, max_chars: int) -> str:
    """Estrae finestre di testo attorno alle parole chiave, unendo quelle sovrapposte."""
    content_lower = content.lower()
    WINDOW = 1200
    positions = []
    for word in search_words:
        start = 0
        count = 0
        while count < 5:
            idx = content_lower.find(word, start)
            if idx == -1:
                break
            positions.append(idx)
            start = idx + len(word)
            count += 1
    if not positions:
        return content[:max_chars] + "\n[...contenuto troncato...]"
    positions.sort()
    windows = []
    for pos in positions:
        s, e = max(0, pos - WINDOW), min(len(content), pos + WINDOW)
        if windows and s <= windows[-1][1]:
            windows[-1] = (windows[-1][0], e)
        else:
            windows.append((s, e))
    parts = []
    total = 0
    for s, e in windows:
        chunk = content[s:e]
        if total + len(chunk) > max_chars:
            chunk = chunk[:max_chars - total]
        parts.append(("[...]\n" if s > 0 else "") + chunk)
        total += len(chunk)
        if total >= max_chars:
            break
    return "\n".join(parts) + "\n[...estratti rilevanti dal documento completo...]"

async def get_oracle_tone_hint() -> str:
    s = await db.settings.find_one({"id": "app_settings"}, {"_id": 0, "oracle_tone": 1}) or {}
    tone = (s.get("oracle_tone") or "").strip()
    if not tone:
        return ""
    return f"""

=== TONO DELL'ORACOLO (personalizzato dalla Narrazione, ha PRIORITÀ sulle linee guida di tono standard) ===
{tone}
=== FINE TONO ==="""

async def apply_sheet_sync(user_id: str, sheet_data: dict):
    """Sincronizza il Background dell'app con la scheda ufficiale del DB esterno."""
    updates = map_sheet_to_background(sheet_data)
    await db.backgrounds.update_one(
        {"user_id": user_id},
        {"$set": updates, "$setOnInsert": {"user_id": user_id, "vie": [], "rituals": [], "locked_for_player": False}},
        upsert=True
    )

async def ensure_sheet_synced(user: dict):
    """Sync mensile (1 volta al mese) o forzato (dopo un pallino). Ritorna (user_aggiornato, did_sync)."""
    if not user.get("sheet_id"):
        return user, False
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    if user.get("sheet_sync_month") == month and not user.get("force_sheet_sync") and user.get("sheet_data"):
        return user, False
    try:
        sheet_data, _ = await fetch_sheet(user["sheet_id"], force=True)
    except Exception as e:
        logger.warning(f"Sync scheda fallito per {user.get('email')}: {e}")
        return user, False
    if not (sheet_data or {}).get("personaggio"):
        return user, False
    await apply_sheet_sync(user["id"], sheet_data)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"sheet_data": sheet_data, "sheet_sync_month": month, "force_sheet_sync": False}}
    )
    return {**user, "sheet_data": sheet_data, "sheet_sync_month": month, "force_sheet_sync": False}, True

async def get_sheet_block(user: dict):
    """Ritorna (contesto_scheda, did_sync). Usa lo snapshot salvato; sincronizza solo se mese nuovo o sync forzato."""
    if not user.get("sheet_id"):
        return "", False
    user, did_sync = await ensure_sheet_synced(user)
    data = user.get("sheet_data")
    if not data:
        return "", did_sync
    return build_sheet_context(data), did_sync
