"""
Regression tests iteration 6 - after code-quality refactoring:
- suggested_challenge now returned in POST /api/session/chat
- secrets.randbelow used in challenges/attempt rolls
- admin reset-password uses secrets.token_urlsafe
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://larp-oracle-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PLAYER_EMAIL = "player@test.com"
PLAYER_PASS = "player123"
ADMIN_EMAIL = "downtime@notturnaroma.com"
ADMIN_PASS = "N@rraz1on3"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def player_token():
    return _login(PLAYER_EMAIL, PLAYER_PASS)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


# ==================== Login regression ====================
def test_player_login():
    tok = _login(PLAYER_EMAIL, PLAYER_PASS)
    assert isinstance(tok, str) and len(tok) > 10


def test_admin_login():
    tok = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert isinstance(tok, str) and len(tok) > 10


# ==================== Dashboard endpoints (no loop risk) ====================
def test_dashboard_endpoints_ok(player_token):
    """Every endpoint the Dashboard hits on mount must return 200 (no 500 risk of loop)."""
    h = {"Authorization": f"Bearer {player_token}"}
    endpoints = [
        "/challenges",
        "/session/active",
        "/notifications",
        "/followers/status",
        "/auth/me",
    ]
    for ep in endpoints:
        r = requests.get(f"{API}{ep}", headers=h, timeout=30)
        assert r.status_code in (200, 204), f"{ep} -> {r.status_code} {r.text[:200]}"


# ==================== suggested_challenge field regression ====================
def test_session_chat_returns_suggested_challenge_field(player_token):
    """The bug: previously suggested_challenge was hardcoded None. Now field must exist in response."""
    h = {"Authorization": f"Bearer {player_token}"}
    # Ensure the player has actions available - reset if exhausted
    me = requests.get(f"{API}/auth/me", headers=h, timeout=30).json()
    if me.get("used_actions", 0) >= me.get("max_actions", 10):
        pytest.skip("Player out of actions; skip to avoid mutating DB. See main agent to reset.")

    payload = {"session_id": None, "message": "Osservo la sala e ascolto i sussurri dei presenti"}
    r = requests.post(f"{API}/session/chat", json=payload, headers=h, timeout=120)
    assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:500]}"
    data = r.json()
    # Field must exist (may be null)
    assert "suggested_challenge" in data, "suggested_challenge field missing from SessionChatResponse"
    assert "session_id" in data and "response" in data
    assert isinstance(data["response"], str) and len(data["response"]) > 0
    # Close session to be clean
    try:
        requests.post(f"{API}/session/end", json={"session_id": data["session_id"]}, headers=h, timeout=30)
    except Exception:
        pass


# ==================== Challenge attempt regression (secrets.randbelow) ====================
def test_challenge_attempt_flow(admin_token, player_token):
    """Create a test challenge as admin, attempt it as player, verify result_message, cleanup."""
    ah = {"Authorization": f"Bearer {admin_token}"}
    ph = {"Authorization": f"Bearer {player_token}"}

    challenge_payload = {
        "name": "TEST_regression_challenge_iter6",
        "description": "Prova generata dal test di regressione, cancellare a fine test.",
        "tests": [{
            "attribute": "Forza + Rissa",
            "difficulty": 3,
            "success_text": "Successo di test.",
            "tie_text": "Pareggio di test.",
            "failure_text": "Fallimento di test.",
        }],
        "keywords": ["testregression"],
        "allow_refuge_defense": False,
        "allow_followers_help": False,
    }
    cr = requests.post(f"{API}/challenges", json=challenge_payload, headers=ah, timeout=30)
    assert cr.status_code == 200, f"create challenge failed {cr.status_code} {cr.text}"
    challenge = cr.json()
    ch_id = challenge["id"]

    try:
        # Check if player already attempted (shouldn't since fresh challenge)
        attempt_payload = {
            "challenge_id": ch_id,
            "test_index": 0,
            "player_value": 5,
            "use_refuge": False,
            "followers_to_use": 0,
        }
        ar = requests.post(f"{API}/challenges/attempt", json=attempt_payload, headers=ph, timeout=30)
        # Could be 403 if player out of actions - accept it as a valid skip signal
        if ar.status_code == 403 and "azioni" in ar.text.lower():
            pytest.skip(f"Player has no actions: {ar.text}")
        assert ar.status_code == 200, f"attempt failed {ar.status_code} {ar.text}"
        data = ar.json()
        assert "message" in data, f"message missing: {data}"
        assert "outcome" in data
        assert data["outcome"] in ("success", "tie", "failure")
        # Sanity: message contains multiplication rendering
        assert "×" in data["message"] or "x" in data["message"].lower()
    finally:
        # Cleanup: delete challenge + delete attempt log so player is not blocked
        requests.delete(f"{API}/challenges/{ch_id}", headers=ah, timeout=30)


# ==================== Admin reset-password (secrets top-level) ====================
def test_admin_reset_password_then_restore(admin_token):
    """POST /api/admin/users/{id}/reset-password returns temp_password. Then restore player's password."""
    ah = {"Authorization": f"Bearer {admin_token}"}

    # Find player id
    users_r = requests.get(f"{API}/admin/users", headers=ah, timeout=30)
    assert users_r.status_code == 200, users_r.text
    users = users_r.json()
    player = next((u for u in users if u.get("email") == PLAYER_EMAIL), None)
    assert player, "player@test.com not found in admin users list"
    pid = player["id"]

    # Reset password
    r = requests.post(f"{API}/admin/users/{pid}/reset-password", headers=ah, timeout=30)
    assert r.status_code == 200, f"reset-password failed: {r.status_code} {r.text}"
    data = r.json()
    assert "temp_password" in data and isinstance(data["temp_password"], str) and len(data["temp_password"]) > 4
    temp_pw = data["temp_password"]
    assert temp_pw.startswith("NT-"), f"expected temp password prefix NT-, got {temp_pw}"

    # Login with temp password
    tok = _login(PLAYER_EMAIL, temp_pw)

    # Restore to player123 via change-password endpoint using player's token
    ph = {"Authorization": f"Bearer {tok}"}
    cp = requests.post(
        f"{API}/auth/change-password",
        json={"old_password": temp_pw, "new_password": PLAYER_PASS},
        headers=ph,
        timeout=30,
    )
    assert cp.status_code == 200, f"change-password failed: {cp.status_code} {cp.text}"

    # Verify original password works
    _ = _login(PLAYER_EMAIL, PLAYER_PASS)
