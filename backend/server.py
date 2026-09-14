from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
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
from bson import Binary
import PyPDF2
import io
import re


ROOT_DIR = Path(__file__).parent

from sheets import fetch_sheet, fetch_sheet_list, compute_sheet_test_value
from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse, ChangePasswordRequest,
    UpdateUserActions, UpdateUserRole, UpdateUserRegion, BlockUserRequest,
    LinkSheetRequest, EditAnswerRequest, REGIONS, KB_REGIONS,
    KnowledgeBaseCreate, KnowledgeBaseResponse,
    ChatRequest, ChatResponse, FoundResourceItem,
    StartSessionRequest, EndSessionRequest, SessionChatRequest, SessionChatResponse,
    Background, FollowerStatus,
    ResourceItemCreate, ResourceItemUpdate, ResourceItemResponse,
    ResourceAvailableResponse, ResourcePurchaseRequest,
    AppSettings, AppSettingsResponse,
    ChallengeCreate, ChallengeResponse, ChallengeAttempt,
    AidCreate, AidResponse, UseAid,
    NPCCreate, NPCUpdate, NPCResponse, NPCInteractionResponse,
)
from core import (
    db, client, logger, get_file_type, security,
    JWT_SECRET, JWT_ALGORITHM, EMERGENT_LLM_KEY,
    hash_password, verify_password, create_token, get_month_key,
    get_follower_spent_this_month, get_effective_max_actions, check_monthly_reset,
    get_current_user, get_admin_user, get_target_for_admin_action,
    check_kb_region_rights, has_required_contacts, has_required_background,
    is_doc_visible_to_player, get_oracle_tone_hint, apply_sheet_sync, get_sheet_block,
    ensure_sheet_synced, derive_knowledge_from_attribute, quarter_key, KNOWLEDGE_TYPES,
    extract_relevant_excerpts,
)

app = FastAPI()
api_router = APIRouter(prefix="/api")


@api_router.get("/followers/status", response_model=FollowerStatus)
async def get_follower_status(user: dict = Depends(get_current_user)):
    """Ritorna la situazione dei SEGUACI per il mese corrente"""
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
        remaining_actions_before=remaining_before,
        effective_max_actions=effective_max
    )

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    # Verifica corrispondenza con il database schede (case-insensitive)
    try:
        sheets_list = await fetch_sheet_list()
    except Exception:
        raise HTTPException(status_code=502, detail="Database schede non raggiungibile. Riprova più tardi.")
    cname = data.character_name.strip().lower()
    pname = data.player_name.strip().lower()
    match = next((s for s in sheets_list if str(s.get("nomepg", "")).strip().lower() == cname), None)
    if not match:
        match = next((s for s in sheets_list if str(s.get("nomeplayer", "")).strip().lower() == pname), None)
    if not match:
        raise HTTPException(
            status_code=403,
            detail="Nessuna scheda corrisponde: il Nome e Cognome Giocatore o il Nome Personaggio devono coincidere con quelli della scheda ufficiale."
        )
    already_linked = await db.users.find_one({"sheet_id": str(match["idutente"])})
    if already_linked:
        raise HTTPException(status_code=403, detail="Questa scheda è già collegata a un altro account. Contatta la Narrazione.")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    region = data.region if data.region in REGIONS else None
    user_doc = {
        "id": user_id,
        "email": data.email,
        "username": data.character_name.strip(),
        "player_name": data.player_name.strip(),
        "password_hash": hash_password(data.password),
        "role": "player",
        "region": region,
        "sheet_id": str(match["idutente"]),
        "sheet_name": match.get("nomepg"),
        "max_actions": 10,
        "used_actions": 0,
        "created_at": now.isoformat(),
        "last_action_reset": now.isoformat()
    }
    await db.users.insert_one(user_doc)

    # Sincronizzazione iniziale della scheda
    try:
        sheet_data, _ = await fetch_sheet(str(match["idutente"]), force=True)
        await apply_sheet_sync(user_id, sheet_data)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"sheet_data": sheet_data, "sheet_sync_month": now.strftime("%Y-%m"), "force_sheet_sync": False}}
        )
    except Exception as e:
        logger.warning(f"Sync iniziale scheda fallito per {data.email}: {e}")

    token = create_token(user_id, "player")
    user_response = UserResponse(
        id=user_id, email=data.email, username=data.character_name.strip(),
        role="player", max_actions=10, used_actions=0, region=region,
        sheet_id=str(match["idutente"]), sheet_name=match.get("nomepg"), player_name=data.player_name.strip()
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Account bloccato dalla Narrazione")

    # Sync mensile / forzato della scheda al log-in
    user, _ = await ensure_sheet_synced(user)

    token = create_token(user["id"], user["role"])
    user_response = UserResponse(
        id=user["id"], email=user["email"], username=user["username"],
        role=user["role"], max_actions=user["max_actions"], used_actions=user["used_actions"],
        is_super_admin=user.get("is_super_admin", False), blocked=user.get("blocked", False),
        region=user.get("region"), sheet_id=user.get("sheet_id"), sheet_name=user.get("sheet_name"),
        player_name=user.get("player_name")
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if not verify_password(data.old_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="La password attuale non è corretta")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 6 caratteri")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    return {"message": "Password aggiornata con successo"}


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], username=user["username"],
        role=user["role"], max_actions=user["max_actions"], used_actions=user["used_actions"],
        is_super_admin=user.get("is_super_admin", False), blocked=user.get("blocked", False),
        region=user.get("region"), sheet_id=user.get("sheet_id"), sheet_name=user.get("sheet_name"),
        player_name=user.get("player_name")
    )

# ==================== KNOWLEDGE BASE ROUTES ====================

@api_router.post("/knowledge", response_model=KnowledgeBaseResponse)
async def create_knowledge(data: KnowledgeBaseCreate, user: dict = Depends(get_admin_user)):
    region = data.region if data.region in KB_REGIONS else "Nazionale"
    check_kb_region_rights(user, region)
    kb_id = str(uuid.uuid4())
    kb_doc = {
        "id": kb_id,
        "title": data.title,
        "content": data.content,
        "category": data.category,
        "file_type": data.file_type or "text",
        "file_url": data.file_url,
        "region": region,
        "required_fama_vampiri": data.required_fama_vampiri,
        "required_fama_mondo_oscuro": data.required_fama_mondo_oscuro,
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
    if user.get("role") not in ["admin", "Narrazione"]:
        bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
        docs = [d for d in docs if is_doc_visible_to_player(d, bg, user)]
    return [KnowledgeBaseResponse(**{
        **doc,
        "file_type": doc.get("file_type", "text"),
        "file_url": doc.get("file_url"),
        "region": doc.get("region") or "Nazionale",
        "required_fama_vampiri": doc.get("required_fama_vampiri"),
        "required_fama_mondo_oscuro": doc.get("required_fama_mondo_oscuro"),
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
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("uploaded"),
    region: str = Form("Nazionale"),
    required_fama_vampiri: Optional[int] = Form(None),
    required_fama_mondo_oscuro: Optional[int] = Form(None),
    user: dict = Depends(get_admin_user)
):
    """Upload file: testo, PDF, immagini o video"""
    if region not in KB_REGIONS:
        region = "Nazionale"
    check_kb_region_rights(user, region)
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
    
    # Salva i byte del file su MongoDB (persistente anche in produzione)
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File troppo grande (max 15MB)")
    await db.upload_files.update_one(
        {"filename": saved_filename},
        {"$set": {
            "filename": saved_filename,
            "content_type": file.content_type or "application/octet-stream",
            "data": Binary(content)
        }},
        upsert=True
    )
    
    # File URL
    file_url = f"/api/uploads/{saved_filename}"
    
    # Save to database
    kb_id = str(uuid.uuid4())
    kb_doc = {
        "id": kb_id,
        "title": filename,
        "content": text_content,
        "category": category or "uploaded",
        "region": region,
        "required_fama_vampiri": required_fama_vampiri,
        "required_fama_mondo_oscuro": required_fama_mondo_oscuro,
        "file_type": file_type,
        "file_url": file_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"]
    }
    await db.knowledge_base.insert_one(kb_doc)
    
    return KnowledgeBaseResponse(**{k: v for k, v in kb_doc.items() if k != "_id"})

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve i file caricati (da MongoDB)"""
    doc = await db.upload_files.find_one({"filename": filename})
    if not doc:
        raise HTTPException(status_code=404, detail="File non trovato")
    return Response(content=bytes(doc["data"]), media_type=doc.get("content_type", "application/octet-stream"))

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def send_chat(data: ChatRequest, user: dict = Depends(get_current_user)):
    # Admin/Narrazione: nessun limite azioni
    is_admin = user.get("role") in ["admin", "Narrazione"]
    if not is_admin:
        # Check action limit (usa limite effettivo 20 + SEGUACI - SEGUACI_spesi)
        effective_max = await get_effective_max_actions(user)
        if user["used_actions"] >= effective_max:
            raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")
    
    # Recupera background del PG per filtrare in base ai requisiti
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    # Scheda ufficiale dal DB esterno (sincronizza il background se aggiornata)
    sheet_ctx, sheet_fresh = await get_sheet_block(user)
    if sheet_fresh:
        bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    # Get knowledge base context
    kb_docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(100)
    
    # Filtra i documenti KB in base a regione, FAMA e background del PG
    if not is_admin:
        kb_docs = [doc for doc in kb_docs if is_doc_visible_to_player(doc, bg, user)]
    context = "\n\n".join([f"### {doc['title']}\n{doc['content']}" for doc in kb_docs])
    
    # Cerca oggetti RISORSE che matchano le keywords della domanda
    question_lower = data.question.lower()
    all_items = await db.resource_items.find({}, {"_id": 0}).to_list(1000)
    found_items = []
    items_context = ""
    
    for item in all_items:
        keywords = item.get("location_keywords") or ""
        if keywords:
            kw_list = [kw.strip().lower() for kw in keywords.split(",") if kw.strip()]
            # Verifica se una delle keywords è presente nella domanda
            for kw in kw_list:
                if kw in question_lower:
                    # Verifica disponibilità
                    remaining = item.get("remaining_quantity")
                    if remaining is None or remaining > 0:
                        found_items.append(FoundResourceItem(
                            id=item["id"],
                            name=item["name"],
                            description=item.get("description"),
                            cost_resources=item.get("cost_resources", 0)
                        ))
                        # Aggiungi info per l'IA
                        cost_text = f"{item.get('cost_resources', 0)} RISORSE" if item.get('cost_resources', 0) > 0 else "gratuito"
                        items_context += f"\n- OGGETTO DISPONIBILE: {item['name']} ({cost_text})"
                        if item.get("description"):
                            items_context += f" - {item['description']}"
                    break  # Evita duplicati per lo stesso oggetto
    
    # Costruisci il messaggio di sistema con gli oggetti trovati
    items_hint = ""
    if items_context:
        items_hint = f"""

=== OGGETTI TROVABILI IN QUESTA ZONA ===
{items_context}
=== FINE OGGETTI ===
Se pertinente alla domanda del giocatore, menziona questi oggetti nella tua risposta narrativa.
"""
    
    # Info sul Clan del giocatore
    clan_hint = ""
    player_clan = bg.get("clan")
    if player_clan:
        clan_hint = f"""

=== INFORMAZIONI SUL GIOCATORE ===
Il personaggio che ti sta parlando appartiene al Clan {player_clan}.
Tieni conto di questa appartenenza nelle tue risposte, usando riferimenti appropriati al Clan e alle sue tradizioni.
=== FINE INFO GIOCATORE ===
"""
    
    tone_hint = await get_oracle_tone_hint()

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
=== FINE CONTESTO ==={clan_hint}{items_hint}{sheet_ctx}{tone_hint}"""
    
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
    
    # Update used actions (solo per non-admin)
    if not is_admin:
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"used_actions": 1}}
        )
    
    return ChatResponse(
        id=chat_id,
        question=data.question,
        answer=answer,
        created_at=chat_doc["created_at"],
        found_items=found_items if found_items else None
    )

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
        challenge_data=h.get("challenge_data"),
        edited=h.get("edited", False),
        edited_by=h.get("edited_by"),
        edited_at=h.get("edited_at")
    ) for h in history]

# ==================== SESSIONI DI CONSULTAZIONE ROUTES ====================

# Keywords che indicano cambio di contesto/fine sessione
CONTEXT_CHANGE_KEYWORDS = [
    "vado via", "me ne vado", "lascio", "cambio zona", "altro quartiere",
    "torno a casa", "finisco", "termino", "chiudo", "basta così",
    "grazie, è tutto", "non ho altre domande"
]

async def detect_context_change(message: str) -> bool:
    """Rileva se il messaggio indica un cambio di contesto"""
    message_lower = message.lower()
    for keyword in CONTEXT_CHANGE_KEYWORDS:
        if keyword in message_lower:
            return True
    return False

async def get_active_session(user_id: str) -> Optional[dict]:
    """Ottiene la sessione attiva per l'utente"""
    session = await db.consultation_sessions.find_one(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    )
    return session

async def get_session_messages(session_id: str) -> List[dict]:
    """Ottiene tutti i messaggi di una sessione"""
    messages = await db.consultation_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return messages

async def get_world_events_for_location(location: str, days: int = 7) -> List[dict]:
    """Ottiene gli eventi del mondo per un luogo negli ultimi N giorni"""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    events = await db.world_events.find(
        {
            "location": {"$regex": location, "$options": "i"},
            "created_at": {"$gte": cutoff.isoformat()}
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return events

# ==================== PNG HELPERS ====================

async def detect_npc_in_message(message: str) -> Optional[dict]:
    """Rileva se il messaggio del giocatore menziona un PNG registrato (per nome o alias).
    Ritorna la scheda PNG completa oppure None."""
    npcs = await db.npcs.find({}, {"_id": 0}).to_list(1000)
    message_lower = message.lower()
    # Priorità: match più lungo vince (evita che "Marco" prevalga su "Marco Valenti")
    matched = []
    for npc in npcs:
        candidates = [npc.get("name", "")] + (npc.get("aliases", []) or [])
        for cand in candidates:
            if not cand or len(cand) < 3:
                continue
            if cand.lower() in message_lower:
                matched.append((len(cand), npc))
                break
    if not matched:
        return None
    matched.sort(key=lambda x: x[0], reverse=True)
    return matched[0][1]

async def get_npc_memory(npc_id: str, current_user_id: str, exclusive: bool, limit_others: int = 8, limit_own: int = 5) -> dict:
    """Recupera la memoria del PNG.
    - Se exclusive=True: ritorna solo le interazioni del PG corrente.
    - Altrimenti: ritorna le ultime interazioni con altri PG + con sé stesso."""
    own = await db.npc_interactions.find(
        {"npc_id": npc_id, "user_id": current_user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit_own)

    others = []
    if not exclusive:
        others = await db.npc_interactions.find(
            {"npc_id": npc_id, "user_id": {"$ne": current_user_id}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit_others)

    return {"own": list(reversed(own)), "others": list(reversed(others))}

def build_npc_context(npc: dict, memory: dict) -> str:
    """Costruisce il blocco di contesto per il system prompt con scheda PNG + memoria."""
    lines = []
    lines.append("=== SCHEDA PNG ATTIVA ===")
    lines.append(f"NOME: {npc['name']}")
    if npc.get("aliases"):
        lines.append(f"ALIAS: {', '.join(npc['aliases'])}")
    if npc.get("clan"):
        lines.append(f"CLAN: {npc['clan']}")
    if npc.get("location"):
        lines.append(f"LUOGO: {npc['location']}")
    lines.append(f"MOOD INIZIALE: {npc.get('mood_initial', 'Neutrale')}")
    if npc.get("personality"):
        lines.append(f"PERSONALITÀ / TONO: {npc['personality']}")
    if npc.get("knowledge_public"):
        lines.append(f"\nCONOSCENZE PUBBLICHE (Livello 1 - accessibili con approccio neutro):\n{npc['knowledge_public']}")
    if npc.get("knowledge_conditional"):
        lines.append(f"\nCONOSCENZE CONDIZIONALI (Livello 2 - fiducia guadagnata o prova superata):\n{npc['knowledge_conditional']}")
    if npc.get("knowledge_secret"):
        lines.append(f"\nCONOSCENZE SEGRETE (Livello 3 - SOLO con Discipline efficaci o successo critico):\n{npc['knowledge_secret']}")
    if npc.get("triggers_open"):
        lines.append(f"\nCOSA APRE IL PNG: {npc['triggers_open']}")
    if npc.get("triggers_close"):
        lines.append(f"COSA CHIUDE IL PNG: {npc['triggers_close']}")
    if npc.get("never_says"):
        lines.append(f"COSA NON DIRÀ MAI: {npc['never_says']}")

    # Regole di esclusività
    if npc.get("exclusive"):
        lines.append("\n=== PNG ESCLUSIVO ===")
        lines.append("Questo PNG è ESCLUSIVO. Le sue interazioni con questo PG NON sono condivise con altri PG.")
        if npc.get("exclusive_rules"):
            lines.append(f"REGOLE SPECIFICHE DI ESCLUSIVITÀ:\n{npc['exclusive_rules']}")
        lines.append("=== FINE ESCLUSIVITÀ ===")

    # Memoria interazioni con altri PG
    if memory.get("others"):
        lines.append("\n=== MEMORIA DEL PNG: INCONTRI PRECEDENTI CON ALTRI PG ===")
        lines.append("Il PNG ricorda questi incontri passati. Le informazioni già rivelate sono ora DISPONIBILI anche per il PG attuale se il PNG decide di condividerle (stesso livello di confidenza raggiunto con gli altri).")
        for i, m in enumerate(memory["others"], 1):
            lines.append(f"\n[{m.get('created_at', '')[:10]}] Con {m.get('user_name', '?')}:")
            lines.append(f"  PG ha detto: «{m.get('user_message', '')[:300]}»")
            lines.append(f"  {npc['name']} ha risposto: «{m.get('npc_response', '')[:400]}»")
        lines.append("=== FINE MEMORIA ALTRI PG ===")
        lines.append("IMPORTANTE: Se il PG attuale chiede di altri PG, il PNG può nominarli (ricorda chi è venuto e quando). Il PNG può anche dire 'l'ho già raccontato a qualcun altro' ma le info restano comunque accessibili.")

    # Memoria interazioni con il PG corrente
    if memory.get("own"):
        lines.append("\n=== MEMORIA DEL PNG: INCONTRI PRECEDENTI CON QUESTO STESSO PG ===")
        lines.append("Il PNG ricorda esplicitamente di aver già parlato con questo specifico PG. NON ripetere le stesse informazioni — riprendi da dove avevate lasciato.")
        for i, m in enumerate(memory["own"], 1):
            lines.append(f"\n[{m.get('created_at', '')[:10]}]")
            lines.append(f"  PG: «{m.get('user_message', '')[:300]}»")
            lines.append(f"  {npc['name']}: «{m.get('npc_response', '')[:400]}»")
        lines.append("=== FINE MEMORIA CON QUESTO PG ===")

    lines.append("\n=== REGOLA FERREA ===")
    lines.append(f"NON inventare informazioni, personalità, mood o conoscenze per {npc['name']} che non siano esplicitamente presenti nella scheda sopra. Se manca un'informazione, il PNG deve deviare ('Non so', 'Non è affar tuo', cambia argomento). La coerenza del personaggio è PRIORITÀ ASSOLUTA.")
    lines.append("=== FINE SCHEDA PNG ===")
    return "\n".join(lines)

async def save_npc_interaction(npc_id: str, npc_name: str, user_id: str, user_name: str, user_message: str, npc_response: str, session_id: Optional[str] = None):
    """Salva l'interazione PG-PNG per costruire la memoria del PNG."""
    doc = {
        "id": str(uuid.uuid4()),
        "npc_id": npc_id,
        "npc_name": npc_name,
        "user_id": user_id,
        "user_name": user_name,
        "user_message": user_message,
        "npc_response": npc_response,
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.npc_interactions.insert_one(doc)

@api_router.post("/session/start")
async def start_consultation_session(data: StartSessionRequest, user: dict = Depends(get_current_user)):
    """Inizia una nuova sessione di consultazione"""
    # Chiudi eventuali sessioni attive
    await db.consultation_sessions.update_many(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "context": data.context or "generale",
        "is_active": True,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "messages_count": 0
    }
    await db.consultation_sessions.insert_one(session_doc)
    
    return {"session_id": session_id, "context": session_doc["context"]}

@api_router.post("/session/end")
async def end_consultation_session(data: EndSessionRequest, user: dict = Depends(get_current_user)):
    """Termina una sessione di consultazione"""
    result = await db.consultation_sessions.update_one(
        {"id": data.session_id, "user_id": user["id"]},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    return {"message": "Sessione terminata"}

@api_router.get("/session/active")
async def get_active_consultation_session(user: dict = Depends(get_current_user)):
    """Ottiene la sessione attiva dell'utente"""
    session = await get_active_session(user["id"])
    if not session:
        return {"session": None}
    
    messages = await get_session_messages(session["id"])
    return {
        "session": session,
        "messages": messages
    }

@api_router.post("/session/chat", response_model=SessionChatResponse)
async def session_chat(data: SessionChatRequest, user: dict = Depends(get_current_user)):
    """Invia un messaggio in una sessione di consultazione"""
    
    # Verifica se è un cambio di contesto
    is_context_change = await detect_context_change(data.message)
    
    # Ottieni o crea sessione
    session = None
    is_new_session = False
    
    if data.session_id:
        session = await db.consultation_sessions.find_one(
            {"id": data.session_id, "user_id": user["id"], "is_active": True},
            {"_id": 0}
        )
    
    if not session:
        session = await get_active_session(user["id"])
    
    # Se è un cambio di contesto, chiudi la sessione attuale e creane una nuova
    if is_context_change and session:
        await db.consultation_sessions.update_one(
            {"id": session["id"]},
            {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        session = None
    
    # Se non c'è sessione attiva, verifica limite azioni e crea nuova sessione
    if not session:
        # Admin/Narrazione: nessun limite, nessun consumo di azioni
        is_admin = user.get("role") in ["admin", "Narrazione"]
        if not is_admin:
            effective_max = await get_effective_max_actions(user)
            if user["used_actions"] >= effective_max:
                raise HTTPException(status_code=403, detail="Hai esaurito le tue consultazioni disponibili")
    else:
        # Limite messaggi per sessione (controllo costi): max 4 messaggi del giocatore
        if user.get("role") not in ["admin", "Narrazione"]:
            user_msgs = await db.consultation_messages.count_documents({"session_id": session["id"], "role": "user"})
            if user_msgs >= 4:
                raise HTTPException(status_code=403, detail="Hai raggiunto il limite di 4 messaggi per questa sessione. Chiudi la sessione e aprine una nuova (consumerà un'azione).")

    if not session:
        # Crea nuova sessione
        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "user_id": user["id"],
            "context": "esplorazione",
            "is_active": True,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": None,
            "messages_count": 0
        }
        await db.consultation_sessions.insert_one(session)
        is_new_session = True

        # Incrementa azioni usate solo per giocatori (non admin)
        if not is_admin:
            await db.users.update_one(
                {"id": user["id"]},
                {"$inc": {"used_actions": 1}}
            )
    
    # Salva messaggio utente
    user_msg_id = str(uuid.uuid4())
    user_msg_doc = {
        "id": user_msg_id,
        "session_id": session["id"],
        "user_id": user["id"],
        "role": "user",
        "content": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.consultation_messages.insert_one(user_msg_doc)
    
    # Recupera background del PG
    bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    # Scheda ufficiale dal DB esterno (sincronizza il background se aggiornata)
    sheet_ctx, sheet_fresh = await get_sheet_block(user)
    if sheet_fresh:
        bg = await db.backgrounds.find_one({"user_id": user["id"]}, {"_id": 0}) or {}

    # Costruisci contesto con poteri del PG
    powers_context = ""
    if bg.get("disciplines"):
        powers_list = []
        for disc in bg["disciplines"]:
            disc_powers = ", ".join([f"{p['name']} (Lv.{p['level']})" for p in disc.get("powers", [])])
            powers_list.append(f"{disc['name']}: {disc_powers}" if disc_powers else disc['name'])
        powers_context += f"\nDiscipline del PG: {'; '.join(powers_list)}"
    
    if bg.get("vie"):
        vie_list = []
        for via in bg["vie"]:
            via_powers = ", ".join([f"{p['name']} (Lv.{p['level']})" for p in via.get("powers", [])])
            vie_list.append(f"{via['name']} ({via['type']}): {via_powers}" if via_powers else f"{via['name']} ({via['type']})")
        powers_context += f"\nVie del PG: {'; '.join(vie_list)}"
    
    if bg.get("rituals"):
        rituals_list = [f"{r['name']} (Lv.{r['level']}, {r['type']})" for r in bg["rituals"]]
        powers_context += f"\nRituali del PG: {', '.join(rituals_list)}"
    
    # Recupera eventi del mondo per il contesto
    world_events_context = ""
    # Estrai possibile luogo dal messaggio per cercare eventi
    location_keywords = ["ostiense", "trastevere", "testaccio", "esquilino", "prati", "magazzino", "stazione", "università"]
    current_location = None
    message_lower = data.message.lower()
    for loc in location_keywords:
        if loc in message_lower:
            current_location = loc
            break
    
    if current_location:
        recent_events = await get_world_events_for_location(current_location, days=7)
        if recent_events:
            events_text = []
            for event in recent_events[:5]:  # Max 5 eventi recenti
                if event["type"] == "object_taken":
                    events_text.append(f"- {event['user_name']} ha preso {event.get('object_name', 'un oggetto')} da {event['location']} ({event['created_at'][:10]})")
                elif event["type"] == "location_visited":
                    events_text.append(f"- {event['user_name']} ha visitato {event['location']} ({event['created_at'][:10]})")
            if events_text:
                world_events_context = f"""

=== EVENTI RECENTI IN QUESTA ZONA (ultimi 7 giorni) ===
{chr(10).join(events_text)}
=== FINE EVENTI ===
Se il PG possiede il potere "Tocco degli Spiriti" (Auspex 4) o simili, puoi rivelare chi ha visitato questo luogo di recente.
"""
    
    # Recupera messaggi precedenti della sessione per contesto conversazione
    previous_messages = await get_session_messages(session["id"])
    conversation_context = ""
    if previous_messages:
        conv_lines = []
        for msg in previous_messages[-10:]:  # Ultimi 10 messaggi
            role_label = "GIOCATORE" if msg["role"] == "user" else "ORACOLO"
            conv_lines.append(f"{role_label}: {msg['content']}")
        conversation_context = f"""

=== CONVERSAZIONE PRECEDENTE IN QUESTA SESSIONE ===
{chr(10).join(conv_lines)}
=== FINE CONVERSAZIONE ===
Continua la narrazione in modo coerente con quanto detto sopra.
"""

    # Get knowledge base context - RICERCA INTELLIGENTE
    # Estrae parole chiave dalla domanda per trovare documenti rilevanti
    question_lower = data.message.lower()
    question_words = set(question_lower.split())
    
    # Parole chiave comuni da ignorare
    stop_words = {'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'da', 'in', 'su', 'per', 'con', 'tra', 'fra', 
                  'che', 'chi', 'cosa', 'come', 'dove', 'quando', 'perché', 'se', 'non', 'mi', 'ti', 'ci', 'vi', 'si',
                  'a', 'e', 'è', 'o', 'ma', 'però', 'anche', 'già', 'poi', 'ora', 'qui', 'là', 'questo', 'quello',
                  'mio', 'tuo', 'suo', 'nostro', 'vostro', 'loro', 'molto', 'poco', 'tutto', 'niente', 'qualcosa',
                  'voglio', 'vorrei', 'posso', 'devo', 'sono', 'sei', 'siamo', 'essere', 'avere', 'fare', 'dire',
                  'decido', 'cerco', 'vado', 'esploro', 'chiedo', 'parlo', 'uso', 'attivo', 'provo'}
    
    search_words = question_words - stop_words
    
    # Pulisci le parole dalla punteggiatura
    search_words = {re.sub(r'[^\w]', '', w) for w in search_words if len(re.sub(r'[^\w]', '', w)) >= 3}
    
    # Rimuovi parole comuni aggiuntive
    extra_stop = {'del', 'della', 'dello', 'dei', 'degli', 'delle', 'sul', 'sulla', 'nel', 'nella', 
                  'parlami', 'dimmi', 'raccontami', 'spiegami', 'descrivi', 'sai', 'conosci'}
    search_words = search_words - extra_stop
    
    logger.info(f"Search words: {search_words}")
    
    # Carica tutti i documenti della KB
    kb_docs = await db.knowledge_base.find({}, {"_id": 0}).to_list(100)
    
    # Filtra per regione, FAMA e requisiti background (solo per giocatori)
    if user.get("role") not in ["admin", "Narrazione"]:
        kb_docs = [doc for doc in kb_docs if is_doc_visible_to_player(doc, bg, user)]
    
    # Calcola rilevanza per ogni documento (dedup per titolo)
    scored_docs = []
    seen_titles = set()
    player_region = user.get("region")
    for doc in kb_docs:
        title_lower = doc.get('title', '').lower()
        if title_lower in seen_titles:
            continue
        seen_titles.add(title_lower)
        content_lower = doc.get('content', '').lower()
        
        # Punteggio basato su match di parole chiave
        score = 0
        title_matches = 0
        for word in search_words:
            if word in title_lower:
                score += 100  # Peso MOLTO maggiore per match nel titolo
                title_matches += 1
            if word in content_lower:
                # Limita il contributo del contenuto per evitare che documenti lunghi dominino
                score += min(content_lower.count(word), 10)
        
        # Bonus per documenti con match multipli nel titolo
        if title_matches > 1:
            score *= title_matches
        
        # PRIORITÀ REGIONALE: la cronaca della regione del giocatore va sempre in cima
        doc_region = doc.get("region") or ""
        if score > 0 and player_region and doc_region == player_region:
            score += 500
        
        if score > 0:
            scored_docs.append((score, doc))
            logger.info(f"Doc '{doc.get('title')}' score: {score} (title_matches: {title_matches}, region: {doc_region})")
    
    # Ordina per rilevanza e prendi i top documenti
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    
    # Limita il contesto a ~50000 caratteri (circa 12500 token)
    # Ogni documento contribuisce al massimo PER_DOC_CAP caratteri: i documenti enormi
    # vengono ridotti a ESTRATTI attorno alle parole chiave, così i documenti più piccoli
    # e specifici (es. cronache regionali) entrano SEMPRE nel contesto.
    MAX_CONTEXT_CHARS = 50000
    PER_DOC_CAP = 15000
    context = ""
    context_chars = 0
    
    for score, doc in scored_docs:
        remaining = MAX_CONTEXT_CHARS - context_chars
        if remaining < 1500:
            break
        cap = min(PER_DOC_CAP, remaining)
        body = doc['content']
        if len(body) > cap:
            body = extract_relevant_excerpts(body, search_words, cap)
        doc_text = f"### {doc['title']}\n{body}\n\n"
        context += doc_text
        context_chars += len(doc_text)
    
    # Se nessun documento rilevante trovato, usa un contesto generico
    if not context:
        context = "Nessun documento specifico trovato per questa richiesta. Rispondi in base alle tue conoscenze del mondo di Vampire: The Masquerade."
    
    # Cerca oggetti
    all_items = await db.resource_items.find({}, {"_id": 0}).to_list(1000)
    found_items = []
    items_context = ""
    
    for item in all_items:
        keywords = item.get("location_keywords") or ""
        if keywords:
            kw_list = [kw.strip().lower() for kw in keywords.split(",") if kw.strip()]
            for kw in kw_list:
                if kw in question_lower:
                    remaining = item.get("remaining_quantity")
                    if remaining is None or remaining > 0:
                        found_items.append(FoundResourceItem(
                            id=item["id"],
                            name=item["name"],
                            description=item.get("description"),
                            cost_resources=item.get("cost_resources", 0)
                        ))
                        cost_text = f"{item.get('cost_resources', 0)} RISORSE" if item.get('cost_resources', 0) > 0 else "gratuito"
                        items_context += f"\n- OGGETTO DISPONIBILE: {item['name']} ({cost_text})"
                        if item.get("description"):
                            items_context += f" - {item['description']}"
                    break
    
    items_hint = ""
    if items_context:
        items_hint = f"""

=== OGGETTI TROVABILI IN QUESTA ZONA ===
{items_context}
=== FINE OGGETTI ===
"""
    
    # Recupera prove LARP disponibili per suggerirle
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(50)
    challenges_hint = ""
    if challenges:
        ch_list = []
        for ch in challenges:
            keywords = ", ".join(ch.get("keywords", []))
            tests_desc = []
            for t in ch.get("tests", []):
                tests_desc.append(f"{t.get('attribute', 'Attributo')} diff.{t.get('difficulty', 7)}")
            ch_list.append(f"- {ch['name']} (keywords: {keywords}): {'; '.join(tests_desc)}")
        challenges_hint = f"""

=== PROVE LARP DISPONIBILI (configurate dalla Narrazione) ===
Se la situazione lo richiede, puoi suggerire al giocatore di affrontare una di queste prove:
{chr(10).join(ch_list)}
SOLO per queste prove configurate, suggeriscile citando il loro nome o le loro keywords.
Per qualsiasi altra prova NON in questo elenco, NON usare mai frasi come "Effettua una prova contrapposta su...": usa ESCLUSIVAMENTE il marcatore [PROVA_IMPROVVISATA|...] descritto nelle regole.
=== FINE PROVE ===
"""
    
    clan_hint = ""
    player_clan = bg.get("clan")
    if player_clan:
        clan_hint = f"""

=== INFORMAZIONI SUL GIOCATORE ===
Clan: {player_clan}
{powers_context}
=== FINE INFO GIOCATORE ===
"""

    # Rileva PNG menzionato nel messaggio e costruisci contesto PNG
    user_doc_for_npc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "username": 1})
    current_user_name = user_doc_for_npc.get("username", "Sconosciuto") if user_doc_for_npc else "Sconosciuto"
    detected_npc = await detect_npc_in_message(data.message)
    npc_block = ""
    if detected_npc:
        npc_memory = await get_npc_memory(detected_npc["id"], user["id"], bool(detected_npc.get("exclusive")))
        npc_block = "\n\n" + build_npc_context(detected_npc, npc_memory)
        logger.info(f"PNG rilevato: {detected_npc['name']} (esclusivo={detected_npc.get('exclusive')}, memoria_altri={len(npc_memory['others'])}, memoria_sé={len(npc_memory['own'])})")

    tone_hint = await get_oracle_tone_hint()

    system_message = f"""Sei l'Oracolo di un LARP Vampire: The Masquerade. Questa è una SESSIONE DI ESPLORAZIONE INTERATTIVA.

=== REGOLE ESPLORAZIONE ===
1. Il giocatore sta esplorando un luogo o situazione. Puoi fare domande, offrire scelte, suggerire direzioni.
2. PROVE: privilegia SEMPRE le "PROVE LARP DISPONIBILI" configurate dalla Narrazione quando pertinenti alla scena. SOLO se nessuna prova configurata è adatta E la dinamica narrativa lo rende STRETTAMENTE NECESSARIO (raramente, non a ogni scena: la maggior parte delle interazioni NON richiede prove), puoi improvvisare UNA prova contrapposta aggiungendo alla FINE della risposta, su una riga a parte, ESATTAMENTE questo marcatore:
[PROVA_IMPROVVISATA|Nome breve della prova|Attributo + Abilità|difficoltà da 1 a 10|Tipologia]
dove Tipologia è UNA tra: Accademiche classiche, Criminalità, Etichetta, Militari, Occulto, Scienze, oppure "-" se non pertinente. Se i documenti della Narrazione descrivono già una prova per la situazione in corso (con attributo e difficoltà), usa il marcatore con ESATTAMENTE quei valori. Non usare mai il marcatore per le prove già configurate nell'elenco e non improvvisare più di una prova per sessione. IMPORTANTE: NON scrivere MAI al giocatore frasi come "Effettua una prova contrapposta su X a difficoltà Y" — se una prova non configurata è davvero necessaria, usa SOLO il marcatore: sarà il sistema a mostrarla al giocatore.
3. Puoi chiedere al giocatore se possiede determinati poteri quando è rilevante (es. "Possiedi Auspex o poteri simili?")
4. Se il giocatore trova un oggetto, descrivilo narrativamente. L'oggetto può essere preso gratuitamente se non ha costo.
5. La sessione continua finché il giocatore non cambia zona o dice di voler terminare.
6. Se il giocatore dice di aver superato o fallito una prova, continua la narrazione di conseguenza.
7. Se un altro PG ha visitato questo luogo di recente (vedi eventi), tienine conto nella narrazione.
8. FEDELTÀ ALLE FONTI (REGOLA ASSOLUTA): nomi propri di personaggi, cariche cittadine (Principe, Siniscalco, Primogeniti, Arpie, Sceriffo...), luoghi e fazioni DEVONO provenire ESCLUSIVAMENTE dai documenti nel CONTESTO DELL'EVENTO. NON inventare MAI nomi, clan o titolari di cariche non presenti nei documenti. Se l'informazione richiesta non è nei documenti, resta vago in modo narrativo (es. "Nessuno pronuncia quel nome a voce alta... dovrai guadagnarti questa informazione sul campo") e suggerisci al giocatore come scoprirla in gioco. Un nome inventato è un errore GRAVE che rompe la coerenza della cronaca.

=== REGOLE INCONTRI CON PNG (Personaggi Non Giocanti) ===
Quando il giocatore incontra un PNG descritto nel contesto:

1. PRESENTAZIONE: Descrivi il PNG con il suo mood iniziale (ostile, diffidente, neutrale, amichevole). Usa dialoghi diretti per dare personalità.

2. OPZIONI DI INTERAZIONE: Offri sempre scelte al giocatore, ad esempio:
   - Allontanarti / Lasciarlo stare
   - Rispondere a tono / Intimidire
   - Essere gentile / Diplomazia
   - Usare una Disciplina (specifica quali potrebbero funzionare)
   - Altre azioni contestuali

3. CONSEGUENZE DEL COMPORTAMENTO:
   - Atteggiamento aggressivo → Il PNG si chiude, potrebbe chiamare aiuto, la conversazione finisce male
   - Atteggiamento diplomatico → Richiede una prova (es. Carisma+Sotterfugio) per guadagnare fiducia
   - Uso di Discipline → Chiedi se il PG possiede il potere, poi descrivi l'effetto (successo/fallimento)
   - Intimidazione → Può funzionare ma lascia tracce (il PNG ricorderà, potrebbe parlarne)

4. INFORMAZIONI PROGRESSIVE:
   - Il PNG NON rivela tutto subito
   - Livello 1 (base): Info generiche, disponibili con approccio neutro
   - Livello 2 (parziale): Richiede fiducia guadagnata o prova superata
   - Livello 3 (completa): Solo con successo critico, Disciplina efficace, o comportamento perfetto

5. FINE CONVERSAZIONE:
   - Quando il PNG ha rivelato tutto ciò che sa o è disposto a dire, chiudi la conversazione naturalmente
   - Es: "La guardia si allontana borbottando..." / "Il barista si gira verso altri clienti, hai capito che non dirà altro"
   - Se il PG insiste dopo la chiusura, il PNG diventa infastidito o sospettoso

6. MEMORIA DELLA CONVERSAZIONE:
   - Tieni traccia di cosa è già stato rivelato nella sessione
   - Non ripetere le stesse informazioni
   - Se il PG chiede qualcosa già detto, il PNG può rispondere irritato "Te l'ho già detto!"

7. COERENZA ASSOLUTA CON LA SCHEDA PNG:
   - Se il contesto contiene una "SCHEDA PNG ATTIVA", DEVI usare ESCLUSIVAMENTE quelle informazioni per mood, personalità, conoscenze e reazioni.
   - NON inventare tratti, storie o conoscenze non presenti nella scheda.
   - Se il PG chiede qualcosa non coperto dalla scheda, il PNG devia, cambia argomento o ammette ignoranza.
   - Se la scheda contiene "MEMORIA del PNG" con incontri precedenti, il PNG RICORDA quegli eventi e può nominare gli altri PG già incontrati (a meno che il PNG sia ESCLUSIVO).

TONO: Oscuro, gotico, atmosferico. Dialoghi realistici e cinici. Rispondi SEMPRE in italiano.

=== CONTESTO DELL'EVENTO ===
{context}
=== FINE CONTESTO ==={clan_hint}{items_hint}{challenges_hint}{world_events_context}{conversation_context}{npc_block}{sheet_ctx}{tone_hint}"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"session-{session['id']}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=data.message)
        answer = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        answer = "L'Oracolo è momentaneamente avvolto dalle tenebre. Riprova tra poco."

    # ==== PROVA IMPROVVISATA DALL'ORACOLO (rara, solo se strettamente necessario) ====
    suggested_challenge = None
    improv = re.search(r"\[PROVA_IMPROVVISATA\|([^|\]]+)\|([^|\]]+)\|[^|\]]*?(\d+)[^|\]]*\|([^\]]*)\]", answer)
    if "[PROVA_IMPROVVISATA" in answer:
        answer = re.sub(r"\s*\[PROVA_IMPROVVISATA[^\]]*\]?\s*", "\n", answer).strip()
    if improv:
        already = await db.challenges.find_one({"improvised": True, "session_id": session["id"]})
        if not already and user.get("role") == "player":
            kt = improv.group(4).strip()
            if kt not in KNOWLEDGE_TYPES:
                kt = derive_knowledge_from_attribute(improv.group(2)) or None
            ch_doc = {
                "id": str(uuid.uuid4()),
                "name": improv.group(1).strip(),
                "description": "Prova improvvisata dall'Oracolo per la scena in corso.",
                "tests": [{
                    "attribute": improv.group(2).strip(),
                    "difficulty": max(1, min(10, int(improv.group(3)))),
                    "success_text": "Riesci nell'intento: la scena prosegue a tuo favore.",
                    "tie_text": "Esito incerto: ottieni solo in parte ciò che cercavi.",
                    "failure_text": "Fallisci: le tenebre non ti assistono questa volta.",
                    "knowledge_type": kt
                }],
                "keywords": [],
                "improvised": True,
                "session_id": session["id"],
                "for_user_id": user["id"],
                "allow_refuge_defense": False,
                "allow_followers_help": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "Oracolo"
            }
            await db.challenges.insert_one(ch_doc)
            ch_doc.pop("_id", None)
            suggested_challenge = ch_doc
            logger.info(f"Prova improvvisata: '{ch_doc['name']}' ({kt}) per {user['email']}")

    # Salva risposta
    assistant_msg_id = str(uuid.uuid4())
    assistant_msg_doc = {
        "id": assistant_msg_id,
        "session_id": session["id"],
        "user_id": user["id"],
        "role": "assistant",
        "content": answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.consultation_messages.insert_one(assistant_msg_doc)
    
    # Aggiorna contatore messaggi sessione
    await db.consultation_sessions.update_one(
        {"id": session["id"]},
        {"$inc": {"messages_count": 2}}
    )
    
    # Salva anche nella chat_history per l'archivio
    chat_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session["id"],
        "question": data.message,
        "answer": answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(chat_doc)

    # Se abbiamo rilevato un PNG, salva l'interazione nella memoria del PNG
    if detected_npc:
        try:
            await save_npc_interaction(
                npc_id=detected_npc["id"],
                npc_name=detected_npc["name"],
                user_id=user["id"],
                user_name=current_user_name,
                user_message=data.message,
                npc_response=answer,
                session_id=session["id"]
            )
        except Exception as e:
            logger.error(f"Errore salvataggio memoria PNG: {e}")

    return SessionChatResponse(
        session_id=session["id"],
        is_new_session=is_new_session,
        response=answer,
        context=session["context"],
        found_items=found_items,
        suggested_challenge=None,
        session_ended=False
    )

@api_router.post("/world/event")
async def record_world_event(
    event_type: str,
    location: str,
    object_name: Optional[str] = None,
    description: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Registra un evento nel mondo di gioco"""
    event_id = str(uuid.uuid4())
    
    # Ottieni nome utente
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "username": 1})
    user_name = user_doc.get("username", "Sconosciuto") if user_doc else "Sconosciuto"
    
    event_doc = {
        "id": event_id,
        "type": event_type,
        "user_id": user["id"],
        "user_name": user_name,
        "location": location,
        "object_name": object_name,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.world_events.insert_one(event_doc)
    return {"event_id": event_id}

@api_router.get("/admin/world-events")
async def get_world_events_admin(admin: dict = Depends(get_admin_user)):
    """Ottieni tutti gli eventi del mondo (admin only)"""
    events = await db.world_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return events

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/chat-history/{user_id}", response_model=List[ChatResponse])
async def get_user_chat_history_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Ottieni l'archivio delle consultazioni di un utente (admin only)"""
    history = await db.chat_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return [ChatResponse(
        id=h["id"],
        question=h["question"],
        answer=h["answer"],
        created_at=h["created_at"],
        type=h.get("type", "chat"),
        challenge_data=h.get("challenge_data"),
        edited=h.get("edited", False),
        edited_by=h.get("edited_by"),
        edited_at=h.get("edited_at")
    ) for h in history]

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/admin/users/{user_id}/actions")
async def update_user_actions(user_id: str, data: UpdateUserActions, admin: dict = Depends(get_admin_user)):
    await get_target_for_admin_action(user_id, admin)
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
    if user.get("role") not in ["admin", "Narrazione"]:
        raise HTTPException(status_code=403, detail="Il background è sincronizzato dalla scheda ufficiale e può essere modificato solo dalla Narrazione")
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
async def get_user_background_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get user background (admin only)"""
    doc = await db.backgrounds.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return Background(user_id=user_id)
    return Background(**doc)

@api_router.post("/resources", response_model=ResourceItemResponse)
async def create_resource_item(data: ResourceItemCreate, admin: dict = Depends(get_admin_user)):
    if data.cost_resources < 0:
        raise HTTPException(status_code=400, detail="Il costo in RISORSE deve essere almeno 0")

    item_id = str(uuid.uuid4())
    doc = {
        "id": item_id,
        "name": data.name,
        "description": data.description,
        "cost_resources": data.cost_resources,
        "block_until": data.block_until,
        "total_quantity": data.total_quantity,
        "remaining_quantity": data.total_quantity,  # Inizialmente uguale al totale
        "max_per_player": data.max_per_player,
        "is_public": data.is_public,
        "location_keywords": data.location_keywords,
        "uses": data.uses,
        "bonus": data.bonus,
        "malus": data.malus,
        "bonus_attribute": data.bonus_attribute
    }
    await db.resource_items.insert_one(doc)
    return ResourceItemResponse(**doc)

@api_router.get("/resources", response_model=List[ResourceItemResponse])
async def list_resource_items(admin: dict = Depends(get_admin_user)):
    docs = await db.resource_items.find({}, {"_id": 0}).to_list(1000)
    return [ResourceItemResponse(**d) for d in docs]

@api_router.put("/resources/{item_id}", response_model=ResourceItemResponse)
async def update_resource_item(item_id: str, data: ResourceItemUpdate, admin: dict = Depends(get_admin_user)):
    """Aggiorna un oggetto del catalogo RISORSE"""
    existing = await db.resource_items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Oggetto non trovato")
    
    update_fields = {}
    if data.name is not None:
        update_fields["name"] = data.name
    if data.description is not None:
        update_fields["description"] = data.description
    if data.cost_resources is not None:
        if data.cost_resources < 0:
            raise HTTPException(status_code=400, detail="Il costo in RISORSE non può essere negativo")
        update_fields["cost_resources"] = data.cost_resources
    if data.block_until is not None:
        update_fields["block_until"] = data.block_until
    if data.total_quantity is not None:
        update_fields["total_quantity"] = data.total_quantity
        # Se cambia il totale, aggiusta anche il rimanente proporzionalmente
        old_total = existing.get("total_quantity")
        old_remaining = existing.get("remaining_quantity")
        if old_total is not None and old_remaining is not None:
            sold = old_total - old_remaining
            update_fields["remaining_quantity"] = max(0, data.total_quantity - sold)
        else:
            update_fields["remaining_quantity"] = data.total_quantity
    if data.max_per_player is not None:
        update_fields["max_per_player"] = data.max_per_player
    if data.is_public is not None:
        update_fields["is_public"] = data.is_public
    if data.location_keywords is not None:
        update_fields["location_keywords"] = data.location_keywords
    if data.uses is not None:
        update_fields["uses"] = data.uses
    if data.bonus is not None:
        update_fields["bonus"] = data.bonus
    if data.malus is not None:
        update_fields["malus"] = data.malus
    if data.bonus_attribute is not None:
        update_fields["bonus_attribute"] = data.bonus_attribute
    
    if update_fields:
        await db.resource_items.update_one({"id": item_id}, {"$set": update_fields})
    
    updated = await db.resource_items.find_one({"id": item_id}, {"_id": 0})
    return ResourceItemResponse(**updated)

@api_router.delete("/resources/{item_id}")
async def delete_resource_item(item_id: str, admin: dict = Depends(get_admin_user)):
    """Elimina un oggetto dal catalogo RISORSE"""
    result = await db.resource_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oggetto non trovato")
    # Rimuovi anche i lock relativi a questo oggetto
    await db.resource_locks.delete_many({"item_id": item_id})
    return {"message": "Oggetto eliminato"}

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

    # Solo oggetti pubblici nel catalogo
    items_docs = await db.resource_items.find({"$or": [{"is_public": True}, {"is_public": {"$exists": False}}]}, {"_id": 0}).to_list(1000)
    items = [ResourceItemResponse(**d) for d in items_docs]

    return ResourceAvailableResponse(
        total_resources=total,
        locked_resources=locked,
        available_resources=available,
        items=items
    )

# Modello per oggetto nell'equipaggiamento
class EquipmentItem(BaseModel):
    id: str
    item_id: str
    item_name: str
    item_description: Optional[str] = None
    cost_resources: int
    acquired_at: str
    unlock_at: Optional[str] = None
    uses: Optional[int] = None  # Utilizzi totali (Null = illimitato)
    remaining_uses: Optional[int] = None  # Utilizzi rimanenti
    bonus: Optional[int] = None
    malus: Optional[int] = None
    bonus_attribute: Optional[str] = None

class EquipmentResponse(BaseModel):
    items: List[EquipmentItem]

@api_router.get("/equipment/me", response_model=EquipmentResponse)
async def get_my_equipment(user: dict = Depends(get_current_user)):
    """Ottieni l'equipaggiamento del giocatore (oggetti acquistati/presi)"""
    # Trova tutti i lock (acquisti) dell'utente
    locks = await db.resource_locks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Recupera info sugli oggetti
    equipment = []
    for lock in locks:
        item = await db.resource_items.find_one({"id": lock["item_id"]}, {"_id": 0})
        if item:
            # Calcola utilizzi rimanenti
            item_uses = item.get("uses")
            remaining_uses = lock.get("remaining_uses")
            
            # Se l'oggetto ha utilizzi limitati e sono esauriti, non mostrarlo
            if remaining_uses is not None and remaining_uses <= 0:
                continue
            
            equipment.append(EquipmentItem(
                id=lock["id"],
                item_id=item["id"],
                item_name=item["name"],
                item_description=item.get("description"),
                cost_resources=lock.get("amount", 0),
                acquired_at=lock["locked_at"],
                unlock_at=lock.get("unlock_at"),
                uses=item_uses,
                remaining_uses=remaining_uses,
                bonus=item.get("bonus"),
                malus=item.get("malus"),
                bonus_attribute=item.get("bonus_attribute")
            ))
    
    return EquipmentResponse(items=equipment)

@api_router.get("/admin/equipment/{user_id}", response_model=EquipmentResponse)
async def get_user_equipment_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Ottieni l'equipaggiamento di un utente (admin only)"""
    locks = await db.resource_locks.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    equipment = []
    for lock in locks:
        item = await db.resource_items.find_one({"id": lock["item_id"]}, {"_id": 0})
        if item:
            item_uses = item.get("uses")
            remaining_uses = lock.get("remaining_uses")
            
            # Mostra anche oggetti esauriti per l'admin (per debug)
            equipment.append(EquipmentItem(
                id=lock["id"],
                item_id=item["id"],
                item_name=item["name"],
                item_description=item.get("description"),
                cost_resources=lock.get("amount", 0),
                acquired_at=lock["locked_at"],
                unlock_at=lock.get("unlock_at"),
                uses=item_uses,
                remaining_uses=remaining_uses,
                bonus=item.get("bonus"),
                malus=item.get("malus"),
                bonus_attribute=item.get("bonus_attribute")
            ))
    
    return EquipmentResponse(items=equipment)

@api_router.post("/resources/purchase", response_model=ResourceAvailableResponse)
async def purchase_resource(req: ResourcePurchaseRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    # Trova oggetto
    item = await db.resource_items.find_one({"id": req.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Oggetto non trovato")

    cost = int(item.get("cost_resources", 0))
    if cost < 0:
        raise HTTPException(status_code=400, detail="Costo RISORSE non valido")

    # Controllo quantità rimanente globale
    remaining_qty = item.get("remaining_quantity")
    if remaining_qty is not None and remaining_qty <= 0:
        raise HTTPException(status_code=403, detail="Oggetto esaurito")

    # Controllo max per giocatore
    max_per_player = item.get("max_per_player")
    if max_per_player is not None:
        # Conta quanti di questo oggetto ha già acquistato il giocatore
        player_purchases = await db.resource_locks.count_documents({
            "user_id": user["id"],
            "item_id": req.item_id
        })
        if player_purchases >= max_per_player:
            raise HTTPException(status_code=403, detail=f"Hai già raggiunto il limite massimo ({max_per_player}) per questo oggetto")

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
    # Per oggetti gratuiti (cost=0), non c'è blocco
    block_until = item.get("block_until")
    if cost > 0:
        if block_until:
            unlock_at = block_until
        else:
            # Primo giorno del mese successivo
            year = now.year + (1 if now.month == 12 else 0)
            month = 1 if now.month == 12 else now.month + 1
            unlock_date = datetime(year, month, 1, tzinfo=timezone.utc)
            unlock_at = unlock_date.isoformat()
    else:
        # Per oggetti gratuiti, unlock immediato
        unlock_at = now.isoformat()

    # Inizializza remaining_uses se l'oggetto ha utilizzi limitati
    item_uses = item.get("uses")
    remaining_uses = item_uses if item_uses is not None else None

    # Crea sempre un record per tracciare l'equipaggiamento
    lock_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "item_id": item["id"],
        "amount": cost,
        "locked_at": now.isoformat(),
        "unlock_at": unlock_at,
        "remaining_uses": remaining_uses
    }
    await db.resource_locks.insert_one(lock_doc)

    # Decrementa la quantità rimanente se l'oggetto ha un limite
    if remaining_qty is not None:
        await db.resource_items.update_one(
            {"id": req.item_id},
            {"$inc": {"remaining_quantity": -1}}
        )

    # Ritorna stato aggiornato
    return await get_available_resources(user)


async def get_user_background(user_id: str, admin: dict = Depends(get_admin_user)):
    doc = await db.backgrounds.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return Background(user_id=user_id)
    return Background(**doc)

@api_router.put("/admin/background/{user_id}", response_model=Background)
async def update_user_background(user_id: str, data: Background, admin: dict = Depends(get_admin_user)):
    # L'admin può modificare liberamente, anche oltre i limiti (solo giocatori della propria regione)
    await get_target_for_admin_action(user_id, admin)
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
    await get_target_for_admin_action(user_id, admin)

    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    # TODO: opzionale - pulire dati correlati (chat_history, background, ecc.)
    return {"message": "Utente eliminato"}


@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, data: UpdateUserRole, admin: dict = Depends(get_admin_user)):
    if data.role not in ["player", "admin"]:
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    await get_target_for_admin_action(user_id, admin)
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Ruolo aggiornato"}

@api_router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str, data: BlockUserRequest, admin: dict = Depends(get_admin_user)):
    """Blocca/sblocca un account. Gli account Narrazione possono essere bloccati solo da NARRAZIONE ITALIA."""
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Non puoi bloccare te stesso")
    await get_target_for_admin_action(user_id, admin)
    await db.users.update_one({"id": user_id}, {"$set": {"blocked": data.blocked}})
    return {"message": "Utente bloccato" if data.blocked else "Utente sbloccato"}


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, admin: dict = Depends(get_admin_user)):
    """La Narrazione genera una password temporanea per un utente che ha smarrito le credenziali."""
    await get_target_for_admin_action(user_id, admin)
    import secrets
    temp_password = "NT-" + secrets.token_urlsafe(6)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(temp_password)}}
    )
    logger.info(f"Password reimpostata per utente {user_id} da {admin['email']}")
    return {"message": "Password temporanea generata. Comunicala al giocatore: dovrà cambiarla dal pulsante Cambia Password.", "temp_password": temp_password}


@api_router.put("/admin/users/{user_id}/region")
async def update_user_region(user_id: str, data: UpdateUserRegion, admin: dict = Depends(get_admin_user)):
    """Assegna/corregge la regione di un utente."""
    if data.region not in REGIONS:
        raise HTTPException(status_code=400, detail="Regione non valida")
    await get_target_for_admin_action(user_id, admin)
    await db.users.update_one({"id": user_id}, {"$set": {"region": data.region}})
    return {"message": "Regione aggiornata"}


@api_router.get("/sheet/me")
async def get_my_sheet(user: dict = Depends(get_current_user)):
    """Scheda ufficiale del giocatore (snapshot sincronizzato)."""
    if not user.get("sheet_id"):
        raise HTTPException(status_code=404, detail="Nessuna scheda collegata al tuo account")
    user, _ = await ensure_sheet_synced(user)
    data = user.get("sheet_data")
    if not data:
        raise HTTPException(status_code=502, detail="Database schede non raggiungibile")
    return {"sheet": data, "synced_month": user.get("sheet_sync_month")}


@api_router.get("/notifications")
async def get_my_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"], "seen": False}, {"_id": 0}).to_list(20)


@api_router.post("/notifications/{notif_id}/ack")
async def ack_notification(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"seen": True}})
    return {"message": "ok"}


@api_router.get("/admin/knowledge-progress/{user_id}")
async def get_knowledge_progress(user_id: str, admin: dict = Depends(get_admin_user)):
    """Conteggio trimestrale delle Prove Contrapposte superate/pareggiate (solo Narrazione)."""
    return await db.knowledge_progress.find({"user_id": user_id}, {"_id": 0}).to_list(100)


@api_router.get("/admin/sheets")
async def list_external_sheets(admin: dict = Depends(get_admin_user)):
    """Lista dei PG dal database esterno NOTTURNA."""
    try:
        return await fetch_sheet_list()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database schede non raggiungibile: {e}")


@api_router.put("/admin/users/{user_id}/sheet")
async def link_user_sheet(user_id: str, data: LinkSheetRequest, admin: dict = Depends(get_admin_user)):
    """Collega/scollega la scheda ufficiale di un giocatore e sincronizza il background."""
    await get_target_for_admin_action(user_id, admin)
    if not data.sheet_id:
        await db.users.update_one({"id": user_id}, {"$unset": {"sheet_id": "", "sheet_name": ""}})
        return {"message": "Scheda scollegata"}
    try:
        sheet_data, _ = await fetch_sheet(data.sheet_id, force=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database schede non raggiungibile: {e}")
    p = (sheet_data or {}).get("personaggio") or {}
    if not p.get("idutente"):
        raise HTTPException(status_code=404, detail="Scheda non trovata nel database")
    duplicate = await db.users.find_one({"sheet_id": str(data.sheet_id), "id": {"$ne": user_id}})
    if duplicate:
        raise HTTPException(status_code=403, detail=f"Questa scheda è già collegata all'account {duplicate.get('email')}")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "sheet_id": str(data.sheet_id),
            "sheet_name": p.get("nomepg"),
            "sheet_data": sheet_data,
            "sheet_sync_month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "force_sheet_sync": False
        }}
    )
    await apply_sheet_sync(user_id, sheet_data)
    return {"message": f"Scheda '{p.get('nomepg')}' collegata e sincronizzata"}


@api_router.put("/admin/chat/{chat_id}/answer")
async def edit_chat_answer(chat_id: str, data: EditAnswerRequest, admin: dict = Depends(get_admin_user)):
    """MODIFICA RISPOSTA: la Narrazione corregge una risposta dell'Oracolo. Resta nello storico con indicazione visibile."""
    chat = await db.chat_history.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Consultazione non trovata")
    await get_target_for_admin_action(chat["user_id"], admin)
    old_answer = chat["answer"]
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_history.update_one(
        {"id": chat_id},
        {"$set": {"answer": data.answer, "edited": True, "edited_by": admin["username"], "edited_at": now}}
    )
    # Mantieni coerenza con la memoria della sessione e dei PNG
    if chat.get("session_id"):
        await db.consultation_messages.update_one(
            {"session_id": chat["session_id"], "role": "assistant", "content": old_answer},
            {"$set": {"content": data.answer, "edited": True, "edited_by": admin["username"], "edited_at": now}}
        )
    await db.npc_interactions.update_many(
        {"user_id": chat["user_id"], "npc_response": old_answer},
        {"$set": {"npc_response": data.answer}}
    )
    return {"message": "Risposta modificata", "edited_at": now}


@api_router.post("/admin/users/{user_id}/reset-actions")
async def reset_user_actions(user_id: str, admin: dict = Depends(get_admin_user)):
    await get_target_for_admin_action(user_id, admin)
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
        "allow_followers_help": data.allow_followers_help,
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
        "allow_followers_help": data.allow_followers_help,
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

    # Gestione uso oggetto dall'equipaggiamento
    equipment_bonus = 0
    equipment_malus = 0
    equipment_name = None
    
    if data.equipment_id:
        # Trova l'oggetto nell'equipaggiamento del giocatore
        equipment_lock = await db.resource_locks.find_one({
            "id": data.equipment_id,
            "user_id": user["id"]
        }, {"_id": 0})
        
        if equipment_lock:
            # Verifica utilizzi rimanenti
            remaining_uses = equipment_lock.get("remaining_uses")
            if remaining_uses is not None and remaining_uses <= 0:
                raise HTTPException(status_code=400, detail="L'oggetto ha esaurito gli utilizzi")
            
            # Recupera info oggetto
            equip_item = await db.resource_items.find_one({"id": equipment_lock["item_id"]}, {"_id": 0})
            if equip_item:
                # Verifica che l'oggetto abbia bonus/malus configurati
                if equip_item.get("bonus") is not None or equip_item.get("malus") is not None:
                    equipment_name = equip_item["name"]
                    equipment_bonus = equip_item.get("bonus") or 0
                    equipment_malus = equip_item.get("malus") or 0
                    
                    # Decrementa utilizzi se limitati
                    if remaining_uses is not None:
                        new_remaining = remaining_uses - 1
                        await db.resource_locks.update_one(
                            {"id": data.equipment_id},
                            {"$set": {"remaining_uses": new_remaining}}
                        )
    
    # Calcolo con fattori random
    player_roll = random.randint(1, 5)
    difficulty_roll = random.randint(1, 5)
    
    # Applica bonus/malus oggetto al valore del giocatore
    # Punteggio calcolato dalla scheda ufficiale (anti-baro); fallback al valore dichiarato se scheda assente
    sheet_value = compute_sheet_test_value(user.get("sheet_data"), test.get("attribute", ""))
    base_player_value = sheet_value if sheet_value is not None else data.player_value
    effective_player_value = base_player_value + equipment_bonus - equipment_malus
    effective_player_value = max(0, effective_player_value)  # Non può essere negativo
    
    player_result = effective_player_value * player_roll
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
    equip_text = f" (usando {equipment_name}: +{equipment_bonus})" if equipment_name and equipment_bonus > 0 else ""
    equip_text += f" (usando {equipment_name}: -{equipment_malus})" if equipment_name and equipment_malus > 0 and equipment_bonus == 0 else ""
    result_message = f"Con il risultato di ({effective_player_value}×{player_roll}) {player_result}{equip_text} contro ({test['difficulty']}×{difficulty_roll}) {difficulty_result}: {outcome_text}"
    
    # Salva nel log (questo blocca tentativi futuri)
    attempt_log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "challenge_id": data.challenge_id,
        "challenge_name": challenge["name"],
        "test_index": data.test_index,
        "test_attribute": test["attribute"],
        "player_value": base_player_value,
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
            "player_value": base_player_value,
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

    # ==== CONTEGGIO TRIMESTRALE CONOSCENZE (invisibile al giocatore) ====
    if user.get("role") == "player" and outcome in ("success", "tie"):
        knowledge = test.get("knowledge_type") or derive_knowledge_from_attribute(test.get("attribute", ""))
        if knowledge:
            now_q = datetime.now(timezone.utc)
            qk = quarter_key(now_q)
            await db.knowledge_progress.update_one(
                {"user_id": user["id"], "quarter": qk, "knowledge": knowledge},
                {"$inc": {"wins": 1}},
                upsert=True
            )
            prog = await db.knowledge_progress.find_one(
                {"user_id": user["id"], "quarter": qk, "knowledge": knowledge}, {"_id": 0}
            )
            if prog and prog.get("wins", 0) >= 5:
                await db.knowledge_progress.update_one(
                    {"user_id": user["id"], "quarter": qk, "knowledge": knowledge},
                    {"$set": {"wins": 0}, "$inc": {"pallini": 1}}
                )
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "type": "pallino",
                    "knowledge": knowledge,
                    "quarter": qk,
                    "created_at": now_q.isoformat(),
                    "seen": False
                })
                await db.users.update_one({"id": user["id"]}, {"$set": {"force_sheet_sync": True}})
                logger.info(f"PALLINO: {user['email']} ha raggiunto 5 prove in {knowledge} ({qk})")

    # Update used actions
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"used_actions": 1}}
    )
    
    return {
        "challenge_name": challenge["name"],
        "attribute": test["attribute"],
        "player_value": base_player_value,
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

# ==================== PNG (NPC) CRUD ROUTES ====================

@api_router.get("/admin/npcs", response_model=List[NPCResponse])
async def list_npcs(admin: dict = Depends(get_admin_user)):
    """Lista tutti i PNG (solo admin/Narrazione)."""
    npcs = await db.npcs.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [NPCResponse(**n) for n in npcs]

@api_router.post("/admin/npcs", response_model=NPCResponse)
async def create_npc(data: NPCCreate, admin: dict = Depends(get_admin_user)):
    """Crea un nuovo PNG."""
    npc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = data.dict()
    doc["id"] = npc_id
    doc["created_at"] = now
    doc["updated_at"] = now
    await db.npcs.insert_one(doc)
    saved = await db.npcs.find_one({"id": npc_id}, {"_id": 0})
    return NPCResponse(**saved)

@api_router.put("/admin/npcs/{npc_id}", response_model=NPCResponse)
async def update_npc(npc_id: str, data: NPCUpdate, admin: dict = Depends(get_admin_user)):
    """Aggiorna un PNG esistente."""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.npcs.update_one({"id": npc_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="PNG non trovato")
    saved = await db.npcs.find_one({"id": npc_id}, {"_id": 0})
    return NPCResponse(**saved)

@api_router.delete("/admin/npcs/{npc_id}")
async def delete_npc(npc_id: str, admin: dict = Depends(get_admin_user)):
    """Elimina un PNG e tutte le sue interazioni salvate."""
    result = await db.npcs.delete_one({"id": npc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PNG non trovato")
    await db.npc_interactions.delete_many({"npc_id": npc_id})
    return {"message": "PNG eliminato"}

@api_router.get("/admin/npcs/{npc_id}/interactions", response_model=List[NPCInteractionResponse])
async def get_npc_interactions(npc_id: str, admin: dict = Depends(get_admin_user)):
    """Ritorna tutte le interazioni registrate con un PNG (admin only)."""
    interactions = await db.npc_interactions.find(
        {"npc_id": npc_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return [NPCInteractionResponse(**i) for i in interactions]

@api_router.delete("/admin/npcs/{npc_id}/interactions")
async def clear_npc_memory(npc_id: str, admin: dict = Depends(get_admin_user)):
    """Azzera la memoria di un PNG (elimina tutte le interazioni)."""
    result = await db.npc_interactions.delete_many({"npc_id": npc_id})
    return {"deleted": result.deleted_count}

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

