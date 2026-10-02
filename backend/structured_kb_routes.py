"""Admin API routes for the structured regional Knowledge Base pilot.

Wire with `api_router.include_router(structured_kb_router)` in server.py after the
main APIRouter is created. Kept isolated during the Lazio pilot so legacy routes
remain unchanged until testing is complete.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from core import db, get_admin_user
from structured_kb import (
    import_regional_payload,
    render_structured_context,
    retrieve_structured_context,
    validate_regional_payload,
)

structured_kb_router = APIRouter(prefix="/structured-kb", tags=["structured-kb"])


@structured_kb_router.post("/import")
async def import_structured_region(payload: Dict[str, Any], user: dict = Depends(get_admin_user)):
    """Import/upsert a JSON regional export. Admin/Narrazione only."""
    errors = validate_regional_payload(payload)
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    try:
        return await import_regional_payload(db, payload, imported_by=user.get("username", "admin"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@structured_kb_router.get("/stats/{region}")
async def structured_region_stats(region: str, user: dict = Depends(get_admin_user)):
    pipeline = [
        {"$match": {"region": region}},
        {"$group": {"_id": "$kind", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    rows = await db.structured_knowledge.aggregate(pipeline).to_list(100)
    return {"region": region, "counts": {row["_id"]: row["count"] for row in rows}}


@structured_kb_router.get("/preview/{region}")
async def preview_structured_retrieval(region: str, q: str, user: dict = Depends(get_admin_user)):
    """Safe admin-only preview: does not call the LLM and does not consume PG actions."""
    records = await retrieve_structured_context(db, q, [region], limit=10)
    return {
        "region": region,
        "query": q,
        "matches": [
            {"id": r["id"], "kind": r["kind"], "title": r["title"]}
            for r in records
        ],
        "context_preview": render_structured_context(records),
    }
