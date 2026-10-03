"""Post-import smoke checks for the regional structured Knowledge Base.
Run from backend with the same environment used by the application:
    python scripts/verify_structured_kb.py Lazio
Does not call the LLM and does not consume PG actions.
"""
import asyncio
import sys
from core import db
from structured_kb import retrieve_structured_context

EXPECTED_LAZIO = {
    "quest": 5,
    "png_vampiro": 13,
    "pg_pubblico": 30,
    "png_mortale_soprannaturale": 1,
    "luogo": 15,
    "oggetto": 3,
    "prova_contrapposta": 1,
    "oracle_rules": 1,
}

async def main():
    region = sys.argv[1] if len(sys.argv) > 1 else "Lazio"
    rows = await db.structured_knowledge.aggregate([
        {"$match": {"region": region}},
        {"$group": {"_id": "$kind", "count": {"$sum": 1}}},
    ]).to_list(100)
    counts = {r["_id"]: r["count"] for r in rows}
    print("COUNTS", counts)

    if region.lower() == "lazio":
        for kind, expected in EXPECTED_LAZIO.items():
            actual = counts.get(kind, 0)
            assert actual == expected, f"{kind}: attesi {expected}, trovati {actual}"

    checks = [
        "Mi reco a Piazza Vittorio e cerco la Porta Alchemica",
        "Investigo la stanza e cerco indizi",
    ]
    for q in checks:
        matches = await retrieve_structured_context(db, q, [region], limit=5)
        print("\nQUERY:", q)
        for m in matches:
            print(" -", m.get("kind"), m.get("title"))
        assert matches, f"Nessun match per: {q}"

    print("\nOK: verifica strutturata completata senza chiamare l'AI.")

if __name__ == "__main__":
    asyncio.run(main())
