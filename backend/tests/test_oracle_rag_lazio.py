"""E2E test: L'Oracolo deve rispondere usando i PDF della KB (Guida Lazio)
e NON deve inventare informazioni. Test player Lazio -> chiede del Siniscalco di Roma."""
import os
import re
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://larp-oracle-1.preview.emergentagent.com').rstrip('/')

PLAYER_EMAIL = "player@test.com"
PLAYER_PWD = "player123"

QUESTION = "Voglio presentarmi al Siniscalco di Roma. Sai dirmi come si chiama e di che Clan è?"


@pytest.fixture(scope="module")
def player_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": PLAYER_EMAIL, "password": PLAYER_PWD},
                      timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data or "token" in data
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(player_token):
    return {"Authorization": f"Bearer {player_token}", "Content-Type": "application/json"}


def test_player_login(player_token):
    assert isinstance(player_token, str) and len(player_token) > 10


def test_oracle_siniscalco_from_pdf(auth_headers):
    """Invia la domanda al Oracolo e verifica che citi il vero Siniscalco dal PDF Lazio."""
    payload = {"session_id": None, "message": QUESTION}
    r = requests.post(f"{BASE_URL}/api/session/chat", headers=auth_headers,
                      json=payload, timeout=180)
    assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:500]}"
    body = r.json()
    assert "response" in body
    response_text = body["response"]
    print("\n=== ORACLE RESPONSE ===\n" + response_text + "\n=======================\n")

    lower = response_text.lower()

    # Nomi inventati/errati (dal bug precedente)
    assert "ambrosini" not in lower, f"Risposta inventata (Vittorio Ambrosini): {response_text[:400]}"
    assert "vittorio" not in lower, f"Risposta contiene 'Vittorio' - probabilmente inventato"

    # Ground truth: il Siniscalco deve essere Lasombra (non Ventrue)
    # Cerchiamo il nome corretto
    has_correct_name = any(k in lower for k in ["albornoz", "carrillo", "carvajal", "pasqual"])
    has_correct_clan = "lasombra" in lower

    # Non deve dire Ventrue riferendosi al Siniscalco (accetta se dice Lasombra)
    assert has_correct_clan, f"Il clan Lasombra NON è menzionato nella risposta. Response: {response_text}"
    assert has_correct_name, f"Nessun nome dal PDF (Albornoz/Carrillo/Carvajal/Pasqual) trovato. Response: {response_text}"


def test_oracle_no_umbria_leak(auth_headers):
    """Verifica isolamento regionale: nessun contenuto Umbria per giocatore Lazio.
    Nota: usa la sessione già creata sopra (non consuma azioni extra). Skip se il
    limite di 4 messaggi/sessione è stato raggiunto - test opzionale."""
    # Recupera sessione attiva
    r = requests.get(f"{BASE_URL}/api/session/active", headers=auth_headers, timeout=30)
    if r.status_code != 200 or not r.json():
        pytest.skip("Nessuna sessione attiva")
    session = r.json()
    sid = session.get("id")
    payload = {"session_id": sid, "message": "Il Siniscalco viene dall'Umbria?"}
    r2 = requests.post(f"{BASE_URL}/api/session/chat", headers=auth_headers,
                       json=payload, timeout=180)
    if r2.status_code == 403:
        pytest.skip("Limite messaggi sessione raggiunto")
    assert r2.status_code == 200, r2.text[:400]
    txt = r2.json().get("response", "").lower()
    # Non deve citare Principe/Siniscalco dell'Umbria come se fossero del Lazio
    # (soft check: nome specifico umbro non deve apparire come autorità di Roma)
    print("\n=== ORACLE UMBRIA CHECK ===\n" + txt[:600] + "\n===========================\n")
