from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage
from core import db, EMERGENT_LLM_KEY, get_current_user, get_effective_max_actions, get_sheet_block, get_oracle_tone_hint
from models import ChatRequest, ChatResponse
from structured_kb import retrieve_structured_context, render_structured_context, get_oracle_rules_context

oracle_v2_router = APIRouter(prefix="/oracle-v2", tags=["oracle-v2"])

@oracle_v2_router.post("/chat", response_model=ChatResponse)
async def oracle_v2_chat(data: ChatRequest, user: dict = Depends(get_current_user)):
    is_admin = user.get("role") in ["admin", "Narrazione"]
    if not is_admin:
        effective_max = await get_effective_max_actions(user)
        if user.get("used_actions", 0) >= effective_max:
            raise HTTPException(status_code=403, detail="Hai esaurito le tue azioni disponibili")

    region = user.get("region") or "Lazio"
    sheet_ctx, _ = await get_sheet_block(user)
    records = await retrieve_structured_context(db, data.question, [region], limit=12)
    structured_context = render_structured_context(records)
    oracle_rules = await get_oracle_rules_context(db, [region])

    q = data.question.lower()
    discipline_markers = ("disciplina", "dominazione", "ascendente", "oscurazione", "quietus", "taumaturgia", "tocco degli spiriti", "potere", "sete")
    doni_context = ""
    if any(marker in q for marker in discipline_markers):
        docs = await db.knowledge_base.find({}, {"_id": 0, "title": 1, "content": 1}).to_list(500)
        docs = [d for d in docs if "doni del sangue" in d.get("title", "").lower() or d.get("title", "").lower() == "doni.pdf"]
        doni_context = "\n\n".join(f"### {d.get('title')}\n{d.get('content', '')}" for d in docs)

    tone_hint = await get_oracle_tone_hint()
    system_message = f"""Sei l'Oracolo di NOTTURNA - Young Blood. Rispondi sempre in italiano.
Usa soltanto il canone fornito e la scheda ufficiale del PG.
Puoi descrivere liberamente ma non inventare fatti, indizi, PNG, oggetti, collegamenti o conseguenze meccaniche.
Se il canone non determina un esito significativo, rimanda alla Narrazione sul gruppo Telegram personale.
Non rivelare informazioni solo perche sono nel contesto: devono essere ottenibili dall'azione del PG.
Non confermare deduzioni non ancora acquisite dal PG.
Per qualsiasi Disciplina la fonte obbligatoria e I DONI DEL SANGUE.
Se una richiesta e realmente ambigua e le interpretazioni cambiano prova o conseguenze, chiedi di precisare azione, obiettivo o approccio.

=== REGOLE ORACOLO ===
{oracle_rules}
=== CANONE REGIONALE RILEVANTE ({region}) ===
{structured_context or '[Nessun record pertinente]'}
=== I DONI DEL SANGUE ===
{doni_context or '[Non richiesto]'}
{sheet_ctx}
{tone_hint}"""

    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"oracle-v2-{user['id']}-{uuid.uuid4()}", system_message=system_message)
        chat.with_model("openai", "gpt-4o")
        answer = await chat.send_message(UserMessage(text=data.question))
    except Exception:
        answer = "L'Oracolo non riesce a elaborare la richiesta in questo momento. Riprova piu tardi."

    now = datetime.now(timezone.utc).isoformat()
    chat_id = str(uuid.uuid4())
    await db.chat_history.insert_one({"id": chat_id, "user_id": user["id"], "question": data.question, "answer": answer, "created_at": now, "type": "oracle_v2", "structured_record_ids": [r.get("id") for r in records]})
    if not is_admin:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"used_actions": 1}})
    return ChatResponse(id=chat_id, question=data.question, answer=answer, created_at=now)
