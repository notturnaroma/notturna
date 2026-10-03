"""CLI importer for structured regional exports.
Usage from backend/: python import_structured_json.py /path/to/region.json
"""
import asyncio
import json
import sys
from pathlib import Path
from core import db, client
from structured_kb import import_regional_payload

async def main(path: str):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    result = await import_regional_payload(db, payload, imported_by="migration-cli")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python import_structured_json.py /percorso/regione.json")
    try:
        asyncio.run(main(sys.argv[1]))
    finally:
        client.close()
