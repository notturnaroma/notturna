"""Pilot ASGI entrypoint.

Run this instead of server:app to test the structured KB without changing the
legacy production entrypoint. It imports the existing application and adds only
new pilot routes.
"""
from server import app, api_router
from structured_kb_routes import structured_kb_router
from oracle_v2_routes import oracle_v2_router

# server.py already mounts api_router on app. Mount pilot routers directly with
# the same /api prefix so production routes remain available and unchanged.
app.include_router(structured_kb_router, prefix="/api")
app.include_router(oracle_v2_router, prefix="/api")
