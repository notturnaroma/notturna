"""Structured regional Knowledge Base helpers for NOTTURNA Oracolo.

This module is intentionally additive: the legacy PDF/text Knowledge Base remains
untouched while regional structured records are imported and tested.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

SECTION_MAP = {
    "quest": "quest",
    "png_vampiri": "png_vampiro",
    "pg_pubblici": "pg_pubblico",
    "png_mortali_soprannaturali": "png_mortale_soprannaturale",
    "luoghi": "luogo",
    "oggetti": "oggetto",
    "prove_contrapposte": "prova_contrapposta",
}

TITLE_FIELDS = {
    "quest": "Titolo della quest",
    "png_vampiro": "Nome e cognome",
    "pg_pubblico": "Nome e cognome del PG",
    "png_mortale_soprannaturale": "Nome e cognome",
    "luogo": "Nome del luogo",
    "oggetto": "Nome dell'oggetto",
    "prova_contrapposta": "Nome della prova",
}

STOPWORDS = {
    "sono", "della", "delle", "degli", "dello", "alla", "alle", "agli", "allo",
    "nella", "nelle", "negli", "nello", "dalla", "dalle", "dagli", "dallo", "come",
    "questo", "questa", "quello", "quella", "anche", "dove", "cosa", "fare", "voglio",
    "vorrei", "posso", "cercare", "cerco", "informazioni", "qualcosa", "prima", "dopo",
    "con", "per", "tra", "fra", "che", "chi", "non", "una", "uno", "del", "dei",
    "nel", "nei", "sul", "sui", "gli", "le", "il", "lo", "la", "un", "di", "a", "e"
}


def _norm(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _tokens(value: Any) -> set[str]:
    return {t for t in _norm(value).split() if len(t) >= 3 and t not in STOPWORDS}


def _flatten(record: Dict[str, Any]) -> str:
    return "\n".join(f"{k}: {v}" for k, v in record.items() if not k.startswith("_") and v not in (None, "", []))


def _record_id(region: str, kind: str, index: int, title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _norm(title)).strip("-")[:80] or str(index)
    return f"{_norm(region).replace(' ', '-')}-{kind}-{slug}-{index}"


def validate_regional_payload(payload: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not payload.get("region"):
        errors.append("region mancante")
    for section in SECTION_MAP:
        if section not in payload:
            errors.append(f"sezione mancante: {section}")
        elif not isinstance(payload[section], list):
            errors.append(f"sezione non valida: {section} deve essere una lista")
    return errors


async def import_regional_payload(db, payload: Dict[str, Any], imported_by: str = "system") -> Dict[str, Any]:
    """Upsert a complete structured regional export into MongoDB.

    Records are stored separately so retrieval can select only relevant canonical
    material instead of injecting the whole regional document into the LLM prompt.
    """
    errors = validate_regional_payload(payload)
    if errors:
        raise ValueError("; ".join(errors))

    region = payload["region"]
    now = datetime.now(timezone.utc).isoformat()
    counts: Dict[str, int] = {}
    active_ids: List[str] = []

    for section, kind in SECTION_MAP.items():
        records = payload.get(section, [])
        counts[kind] = 0
        for index, raw in enumerate(records):
            if raw.get("_template_placeholder"):
                continue
            title_field = TITLE_FIELDS[kind]
            title = str(raw.get(title_field) or f"{kind} {index + 1}").strip()
            rid = _record_id(region, kind, index, title)
            active_ids.append(rid)
            doc = {
                "id": rid,
                "region": region,
                "kind": kind,
                "title": title,
                "data": raw,
                "search_text": _norm(_flatten(raw)),
                "updated_at": now,
                "imported_by": imported_by,
                "source": payload.get("source", {}),
            }
            await db.structured_knowledge.update_one({"id": rid}, {"$set": doc}, upsert=True)
            counts[kind] += 1

    # Remove obsolete records only for the region being re-imported.
    await db.structured_knowledge.delete_many({"region": region, "id": {"$nin": active_ids}})

    oracle_doc = {
        "id": f"{_norm(region).replace(' ', '-')}-oracle-rules",
        "region": region,
        "kind": "oracle_rules",
        "title": f"Regole Oracolo - {region}",
        "data": payload.get("oracle", {}),
        "search_text": _norm(json.dumps(payload.get("oracle", {}), ensure_ascii=False)),
        "updated_at": now,
        "imported_by": imported_by,
        "source": payload.get("source", {}),
    }
    await db.structured_knowledge.update_one({"id": oracle_doc["id"]}, {"$set": oracle_doc}, upsert=True)
    counts["oracle_rules"] = 1
    return {"region": region, "counts": counts, "total": sum(counts.values())}


def _score_record(question: str, record: Dict[str, Any]) -> int:
    qnorm = _norm(question)
    qtokens = _tokens(question)
    title = _norm(record.get("title"))
    data = record.get("data", {})
    text = record.get("search_text") or _norm(_flatten(data))
    score = 0

    if title and title in qnorm:
        score += 100
    title_tokens = _tokens(title)
    score += 12 * len(qtokens & title_tokens)
    score += 2 * len(qtokens & _tokens(text))

    # Activation keywords deserve extra weight for challenge records.
    activation = _norm(data.get("Parole chiave di attivazione", ""))
    if activation:
        score += 5 * len(qtokens & _tokens(activation))

    # Explicit cross-links are stronger than generic body matches.
    links = " ".join(str(data.get(k, "")) for k in ("Collegamenti", "Quest correlate", "Collegata a", "Dove si trova / chi lo possiede"))
    score += 4 * len(qtokens & _tokens(links))
    return score


async def retrieve_structured_context(db, question: str, regions: Iterable[str], limit: int = 10) -> List[Dict[str, Any]]:
    """Return only the most relevant structured records for the current action."""
    regions = [r for r in regions if r]
    query: Dict[str, Any] = {"kind": {"$ne": "oracle_rules"}}
    if regions:
        query["region"] = {"$in": regions}
    docs = await db.structured_knowledge.find(query, {"_id": 0}).to_list(5000)
    ranked = [( _score_record(question, doc), doc) for doc in docs]
    ranked = [(score, doc) for score, doc in ranked if score > 0]
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [doc for _, doc in ranked[:limit]]


async def get_oracle_rules_context(db, regions: Iterable[str]) -> str:
    regions = [r for r in regions if r]
    query: Dict[str, Any] = {"kind": "oracle_rules"}
    if regions:
        query["region"] = {"$in": regions}
    docs = await db.structured_knowledge.find(query, {"_id": 0}).to_list(50)
    return "\n\n".join(_flatten(doc.get("data", {})) for doc in docs if doc.get("data"))


def render_structured_context(records: List[Dict[str, Any]]) -> str:
    if not records:
        return ""
    blocks = []
    for doc in records:
        blocks.append(f"### [{doc.get('kind')}] {doc.get('title')}\n{_flatten(doc.get('data', {}))}")
    return "\n\n".join(blocks)
