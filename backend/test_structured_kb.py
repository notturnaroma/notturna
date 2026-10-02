from structured_kb import _score_record, validate_regional_payload


def test_validation_requires_sections():
    errors = validate_regional_payload({"region": "Lazio"})
    assert any("quest" in e for e in errors)
    assert any("luoghi" in e for e in errors)


def test_exact_title_is_strong_match():
    record = {
        "title": "Piazza Vittorio Emanuele II — Porta Alchemica",
        "data": {"Nome del luogo": "Piazza Vittorio Emanuele II — Porta Alchemica"},
        "search_text": "piazza vittorio emanuele porta alchemica roma esquilino",
    }
    exact = _score_record("Vado a Piazza Vittorio e osservo la Porta Alchemica", record)
    unrelated = _score_record("Cerco informazioni su un vampiro a Ostia", record)
    assert exact > unrelated


def test_activation_keywords_increase_challenge_score():
    record = {
        "title": "Ottenere informazioni sui Tremere influenti di Roma",
        "data": {"Parole chiave di attivazione": "ricerca sui Tremere influenti in città"},
        "search_text": "ottenere informazioni tremere influenti roma ricerca citta",
    }
    assert _score_record("Cerco i Tremere influenti a Roma", record) > 0
