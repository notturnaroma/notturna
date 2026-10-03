"""Contract tests for the isolated Oracle v2 pilot.
These tests avoid the live LLM and validate routing/retrieval invariants.
"""
from structured_kb import _score_record, validate_regional_payload


def test_payload_requires_all_sections():
    errors = validate_regional_payload({"region": "Lazio"})
    assert errors
    assert any("luoghi" in e for e in errors)


def test_exact_place_name_dominates_generic_matches():
    record = {
        "title": "Piazza Vittorio Emanuele II - Porta Alchemica",
        "data": {"Nome del luogo": "Piazza Vittorio Emanuele II - Porta Alchemica"},
        "search_text": "piazza vittorio emanuele porta alchemica roma"
    }
    assert _score_record("Mi reco a Piazza Vittorio e cerco la Porta Alchemica", record) >= 20


def test_activation_keywords_are_weighted():
    record = {
        "title": "Ricerca approfondita",
        "data": {"Parole chiave di attivazione": "perquisisco, investigo, cerco indizi"},
        "search_text": "ricerca approfondita perquisisco investigo cerco indizi"
    }
    assert _score_record("Investigo la stanza e cerco indizi", record) > 0
