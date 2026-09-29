# L'Archivio Maledetto - PRD

## Problem Statement
App per eventi con interfaccia chat AI che risponde a domande basate su knowledge base gestita dallo staff. Include login personale, archivio storico domande/risposte e sistema di controllo azioni per giocatori.

## User Personas
1. **Giocatore**: Utente che pone domande all'Oracolo AI, con azioni limitate
2. **Admin/Staff**: Gestisce knowledge base (upload documenti, inserimento manuale) e controlla azioni utenti

## Core Requirements
- Autenticazione JWT (registro/login)
- Chat AI con OpenAI basata su knowledge base
- Archivio personale domande/risposte
- Sistema controllo azioni (max_actions, used_actions)
- Pannello Admin per gestione KB e utenti
- Design gotico scuro (rosso sangue, blu notte)

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + MongoDB
- AI: OpenAI GPT-4o via emergentintegrations

## What's Been Implemented (Dec 2025)
- [x] Landing page gotica con font UnifrakturMaguntia/Cinzel
- [x] Sistema autenticazione JWT completo
- [x] Dashboard chat con integrazione OpenAI
- [x] Archivio storico personale
- [x] Pannello Admin (gestione KB + utenti)
- [x] Sistema azioni limitate per giocatore
- [x] Upload documenti (.txt, .md)
- [x] Inserimento manuale knowledge base

## Backlog
- P0: (Completato)
- P1: Reset password, filtri archivio, categorie KB
- P2: Dark/light toggle, export conversazioni, notifiche

## Next Actions
1. Aggiungere primo contenuto alla knowledge base
2. Creare account admin per lo staff
3. Configurare limite azioni appropriato per l'evento

## Aggiornamenti (Dec 2025 - v2)
- [x] Reset azioni mensile automatico
- [x] Pannello personalizzazione (colori, testi, logo, sfondo)
- [x] Versione embed responsive per integrazione su siti esterni
- [x] Tab "PERSONALIZZA" nel pannello admin
- [x] Codice embed copiabile con anteprima

## Integrazione su notturnaroma.com
Codice da inserire nel sito HTML:
```html
<iframe 
  src="https://larp-oracle-1.preview.emergentagent.com/embed" 
  style="width: 100%; height: 500px; border: none; border-radius: 8px;"
  title="L'Archivio Maledetto"
></iframe>
```

## Aggiornamenti (Dec 2025 - v3) - Sistema Prove LARP
- [x] Sistema Prove Contrapposte completo
- [x] Admin: creazione prove con X test per situazione
- [x] Ogni test ha: attributo, difficoltà, testi successo/parità/fallimento
- [x] Giocatore: scelta prova → input valore attributo → lancio dadi
- [x] Calcolo: (valore_pg × random 1-5) vs (difficoltà × random 1-5)
- [x] Output formato: "Con il risultato di (5×3) 15 contro (8×2) 16: testo..."
- [x] Log tentativi prove salvato in database
- [x] Ricerca prove per parole chiave nella chat

## Aggiornamenti (Dec 2025 - v4) - Sistema PNG Coerente con Memoria Condivisa
- [x] CRUD PNG completo nel pannello admin (tab "PNG")
- [x] Scheda PNG strutturata: nome, alias, clan, luogo, mood iniziale, personalità, conoscenze a 3 livelli (pubblico/condizionale/segreto), trigger apertura/chiusura, cose mai dette
- [x] Campo `PNG ESCLUSIVO` (Sì/No) con textarea dedicata per regole di esclusività
- [x] Riconoscimento automatico PNG dal messaggio del giocatore (match su nome + alias)
- [x] Iniezione nel system prompt di scheda PNG + memoria interazioni passate con altri PG
- [x] Se PNG non esclusivo: il PNG ricorda chi ha già incontrato e cosa ha rivelato, disponibile anche ai nuovi PG
- [x] Se PNG esclusivo: ogni PG ha una relazione isolata, regole personalizzate
- [x] Salvataggio automatico di ogni interazione PG-PNG in `db.npc_interactions`
- [x] Admin può visualizzare e azzerare la memoria di un PNG
- [x] Regola ferrea nel prompt: se scheda PNG presente, NON inventare info/mood/personalità
- [x] Guida integrata nel pannello PNG con esempi di compilazione

## API Endpoints PNG
- `GET /api/admin/npcs` - Lista PNG
- `POST /api/admin/npcs` - Crea PNG
- `PUT /api/admin/npcs/{id}` - Aggiorna PNG
- `DELETE /api/admin/npcs/{id}` - Elimina PNG + memoria
- `GET /api/admin/npcs/{id}/interactions` - Lista interazioni PNG-PG
- `DELETE /api/admin/npcs/{id}/interactions` - Azzera memoria PNG

## DB Schema (nuove collection)
- `npcs`: {id, name, aliases, clan, location, mood_initial, personality, knowledge_public, knowledge_conditional, knowledge_secret, triggers_open, triggers_close, never_says, exclusive, exclusive_rules, created_at, updated_at}
- `npc_interactions`: {id, npc_id, npc_name, user_id, user_name, user_message, npc_response, session_id, created_at}

## Aggiornamenti (Giu 2026 - v5) - Gerarchia Narrazione + Modifica Risposta + Reset Dati
- [x] Pulizia completa DB: file KB, storici chat, sessioni, eventi mondo, account di prova eliminati
- [x] Account: NARRAZIONE ITALIA (super admin, downtime@notturnaroma.com) + 4 regionali (LAZIO, ABRUZZO, UMBRIA, LOMBARDIA) + player@test.com
- [x] Gerarchia: solo NARRAZIONE ITALIA (is_super_admin) può bloccare/cancellare/modificare gli altri account Narrazione; i regionali non possono agire uno sull'altro
- [x] Blocco account: PUT /api/admin/users/{id}/block, login negato se blocked=true
- [x] MODIFICA RISPOSTA: PUT /api/admin/chat/{id}/answer - tutti gli admin possono correggere le risposte dell'Oracolo; badge "✦ Modificata dalla Narrazione" visibile nell'archivio giocatore e admin; aggiorna anche consultation_messages e npc_interactions per coerenza memoria
- [x] Upload KB con categoria selezionabile (form param category)
- [x] Caricati 5 PDF ufficiali: Design Document + I Doni del Sangue (Regole), Ambientazione, Cronaca Lazio, Cronaca Umbria
- [x] Template schede LUOGHI/PNG/OGGETTI/VOCI: /app/backend/uploads/TEMPLATE-SCHEDE-NOTTURNA.md (scaricabile da /api/uploads/TEMPLATE-SCHEDE-NOTTURNA.md)
- [ ] In attesa: PDF Ambientazione Abruzzo e Lombardia + loghi da posizionare

## Aggiornamenti (Giu 2026 - v6) - Regioni, FAMA, Informazioni Nazionali, Tono Oracolo, Loghi
- [x] Campo REGIONE (Lazio/Abruzzo/Umbria/Lombardia) su utenti: scelto alla registrazione, correggibile dalla Narrazione (PUT /api/admin/users/{id}/region)
- [x] Gating regionale: le Narrazioni regionali vedono tutti gli utenti (filtro regione nel pannello) ma modificano/bloccano/cancellano/editano background e risposte SOLO dei giocatori della propria regione (backend: get_target_for_admin_action). NARRAZIONE ITALIA gestisce tutto
- [x] KB con Regione/Visibilità: documenti regionali (visibili solo ai PG di quella regione) o INFORMAZIONI NAZIONALI (tutti, con requisiti FAMA opzionali). Gestione doc: propria regione + Nazionali (check_kb_region_rights)
- [x] Nuove statistiche background: FAMA TRA I VAMPIRI e FAMA MONDO OSCURO (0-5), gestite dalla Narrazione; gating RAG su documenti nazionali (is_doc_visible_to_player)
- [x] Campo "Tono dell'Oracolo" nel tab Personalizza (settings.oracle_tone): vuoto = tono standard; se compilato ha priorità nel system prompt (chat singola e sessioni)
- [x] Loghi: NOTTURNA centrato in landing (al posto delle scritte, sopra CTA), login, register, nav dashboard; Lucis nel footer landing
- [x] Modal Background in sola lettura e Archivio senza pulsante Modifica per giocatori di altre regioni
- [ ] In attesa: PDF Ambientazione Abruzzo e Lombardia; collegamento con Data Base esterno delle schede (l'utente lo caricherà)

## Aggiornamenti (Giu 2026 - v7) - Collegamento Database Schede + Refactoring
- [x] Integrazione DB esterno schede (https://www.roma-by-night.it/Notturna2/wsPHP/RESTquery.php, env SHEET_API_URL): GET /api/admin/sheets (lista PG), PUT /api/admin/users/{id}/sheet (collega/scollega, guard regionale)
- [x] Sync automatico Background dalla scheda a ogni consultazione (cache 5 min): clan, risorse, rifugio, notorietà, mentore, seguaci, contatti, discipline+poteri, FAMA (fama1=Città, fama2=Vampiri, fama3=Mondo Oscuro). RISORSE: punteggio dalla scheda, meccaniche di spesa/lock invariate
- [x] L'Oracolo conosce l'intera scheda (attributi, skill+specializzazioni, sentiero, status, alleati) e calibra profondità delle risposte (skill 3+ sbloccano dettagli)
- [x] Nuova statistica FAMA IN CITTÀ nel Background (fama_citta)
- [x] Frontend: LinkSheetModal (pulsante "Scheda" nel pannello Utenti), badge nome PG collegato
- [x] REFACTORING server.py: estratti models.py (tutti i modelli Pydantic + REGIONS) e core.py (db, auth, permessi, visibilità KB, sync schede). server.py 2955→2199 righe. Regressione completa passata
- Scheda test collegata: player@test.com ↔ idutente 133 (Rodion Raskolnikov)

## Aggiornamenti (Giu 2026 - v8) - Scheda Giocatore, Registrazione Validata, Conteggio Trimestrale
- [x] "La Mia Scheda" (MySheetModal): il giocatore vede la scheda ufficiale sincronizzata (attributi, fame, discipline, conoscenze, background, contatti) - pulsante SCHEDA nella nav Dashboard, GET /api/sheet/me
- [x] Sync scheda MENSILE (1° del mese, lazy al login/consultazione) invece che continuo + sync FORZATO al login dopo un pallino (users.force_sheet_sync). Snapshot salvato in users.sheet_data
- [x] Registrazione con "Nome e Cognome Giocatore" + "Nome Personaggio": almeno uno deve coincidere (case-insensitive) con nomeplayer/nomepg del DB schede; auto-collegamento scheda; blocco se scheda già collegata ad altro account
- [x] CONTEGGIO TRIMESTRALE INVISIBILE (trimestri da Settembre: Set-Ott-Nov, Dic-Gen-Feb, Mar-Apr-Mag, Giu-Lug-Ago): ogni Prova Contrapposta superata/pareggiata incrementa il contatore della tipologia di conoscenze del test (campo knowledge_type nel form Prove admin, o auto-derivato dall'attributo via KNOWLEDGE_MAP in core.py). A 5 vittorie/pareggi: pop-up "Il Sangue Ricorda - aggiungi un pallino a X" (PallinoModal), contatore azzerato, sync forzato al prossimo login. Collezioni: knowledge_progress, notifications
- [x] Endpoint admin GET /api/admin/knowledge-progress/{user_id} (conteggi visibili solo alla Narrazione)
- [x] Testato E2E: registrazione match/no-match/duplicato, 5 prove vinte -> pop-up Occulto -> ack -> sync al login

## Aggiornamenti (Giu 2026 - v9) - Pannello Conteggi + Prove Improvvisate
- [x] Pannello Conteggi: pulsante "Conteggi" (BarChart3) su ogni giocatore nel tab Utenti, visibile a TUTTI gli account Narrazione (anche altre regioni). Modal KnowledgeProgressModal.jsx con trimestri, vittorie X/5 e pallini assegnati (GET /api/admin/knowledge-progress/{id})
- [x] Prove improvvisate dall'Oracolo: se nessuna prova configurata è adatta e la scena lo rende STRETTAMENTE necessario (raramente), l'IA emette il marcatore [PROVA_IMPROVVISATA|nome|attributo|difficoltà|tipologia]. Il backend lo intercetta (regex tollerante in session_chat), lo rimuove dal testo, crea una prova one-shot in db.challenges (improvised=true, for_user_id, session_id, max 1 per sessione) e la ritorna come suggested_challenge: il frontend la mostra come card prova cliccabile. Le prove improvvisate contano nel conteggio trimestrale (knowledge_type) e sono visibili solo al giocatore destinatario (filtro in GET /challenges)
- [x] Prompt aggiornato: l'IA privilegia le prove configurate, non usa più frasi "Effettua una prova contrapposta..." per prove non configurate
- [x] Testato: marcatore reale emesso dall'IA e parsato (incluso caso "difficoltà 9" nel campo numerico), modal Conteggi via UI come NARRAZIONE UMBRIA

## Aggiornamenti (Giu 2026 - v10) - Cambia Password + Alleati/Gregge + fix landing
- [x] Cambia Password: POST /api/auth/change-password (verifica password attuale, min 6 caratteri) + ChangePasswordModal.jsx, pulsante chiave nella nav Dashboard (tutti gli account). Testato E2E via curl e UI
- [x] Background: nuove voci ALLEATI e GREGGE (model, EditBackgroundModal, sync dalla scheda esterna: backs 'alleati'/'gregge' o 'armento')
- [x] Landing: rimossa la descrizione sotto il logo (richiesta edit visuale)

## Aggiornamenti (Set 2026 - v11) - Anti-baro Prove + Background read-only giocatori
- [x] Prove Contrapposte: il punteggio del PG è calcolato SERVER-SIDE dalla scheda ufficiale (compute_sheet_test_value in sheets.py: parsing "Attributo + Abilità" su attributi/skill/subskill). Il valore dichiarato dal client è ignorato se la scheda è collegata (fallback solo senza scheda). Verificato: dichiarato 99 → usato 8 (Int 3 + Occulto 5)
- [x] ChallengeModal: con scheda collegata l'input punteggio è nascosto, mostra nota "calcolato automaticamente dalla scheda" (prop hasSheet)
- [x] Background: POST /background/me bloccato per i giocatori (403), pagina Background in sola lettura per i player; solo la Narrazione modifica (admin endpoint invariato)
- [x] Prompt: se i PDF della Narrazione descrivono una prova per la situazione, l'Oracolo usa il marcatore con quei valori esatti (oggetti/PNG/luoghi/prove nei PDF vengono letti dal RAG)
- [x] Rimosso import re duplicato (lint)
- Nota lint: F403/F405 da `from models import *` sono attesi (refactor a moduli), non bloccanti a runtime

## Aggiornamenti (Set 2026 - v11b) - Fix lint bloccanti pre-deploy
- [x] Import espliciti da models.py in server.py (rimosso `import *`, aggiunto UseAid)
- [x] Upload file: storage su MongoDB (collezione upload_files, bson Binary, max 15MB) al posto del disco pod — persistente in produzione; /api/uploads/{filename} serve da DB; migrati i 6 file esistenti (5 PDF + template)

## Aggiornamenti (Set 2026 - v12) - Controllo costi + Link PayPal
- [x] Limiti ridotti: 10 azioni/mese (default registrazione, get_effective_max_actions base 10, player esistenti aggiornati) × max 4 messaggi giocatore per sessione (blocco 403 in session_chat, admin esenti). Max 40 messaggi GPT-4o/giocatore/mese
- [x] Campo "Link PayPal" nei settings (paypal_link), editabile SOLO da NARRAZIONE ITALIA nella tab Personalizza (attualmente vuoto, non mostrato altrove: definire dove esporlo)
- [x] Info billing Emergent (da supporto): PayPal solo via Paddle scrivendo a support@emergent.sh; nessun hard cap mensile automatico, esiste limite crediti giornaliero sulla Universal Key + monitoraggio in Account Settings
- Stima costi con nuovi limiti: 35 giocatori ≈ max $42/mese (~210 crediti), realistico $25-30. 100 giocatori ≈ max $120. 150 ≈ max $180

## Aggiornamenti (Set 2026 - v13) - Contatore messaggi sessione
- [x] Contatore "MESSAGGI X/4" nel banner SESSIONE ATTIVA (solo giocatori, rosso a 4/4; data-testid session-msg-counter). Si aggiorna a ogni invio, si azzera a nuova sessione/chiusura, ricalcolato da /session/active al reload
- [x] Confermato reset azioni mensile già esistente (check_monthly_reset: azioni ricaricate al primo accesso del nuovo mese) — nessun limite giornaliero
- [x] Chiarito: link PayPal NON mostrato ai giocatori (resta solo campo interno per NARRAZIONE ITALIA); il pagamento crediti Emergent via PayPal va richiesto dall'utente a support@emergent.sh (Paddle)

## Aggiornamenti (Set 2026 - v14) - Recupero credenziali
- [x] Reset password dalla Narrazione: POST /api/admin/users/{id}/reset-password (guard regionale) genera password temporanea "NT-xxxx" mostrata alla Narrazione (window.prompt copiabile); pulsante chiave nel tab Utenti (reset-password-{id}). Testato E2E incluso 403 cross-regione
- [x] Login: nota "Credenziali dimenticate? Contatta la Narrazione" (forgot-credentials-note)
- [x] Refuso landing corretto ("Domandae" → "Domande") nelle settings
- Costi ricapitolati all'utente: deploy 50 crediti una tantum + hosting ~50 crediti/mese (Starter) + consumo LLM; URL pubblico *.emergent.host dopo il deploy

## Backlog corrente
- P1: Refactoring `server.py` in moduli separati (>2700 righe)
- P2: Campo "Manifesto dell'Oracolo" nel pannello UI per modificare system prompt senza toccare codice
- P2: Inserimento loghi forniti dall'utente (in arrivo)
- P2: Validazione RAG con le nuove schede LUOGHI/PNG/OGGETTI quando l'utente le caricherà


## Aggiornamenti (Set 2026 - v15) - Fix RAG: Oracolo non usava i PDF regionali
- BUG: dopo upload PDF Lazio/Umbria, l'Oracolo inventava nomi (es. Siniscalco fittizio) invece di usare la KB.
- ROOT CAUSE: (a) il context builder faceva `break` dopo il primo documento grande (Design Doc 227K riempiva tutti i 50K di contesto, escludendo la Guida Lazio); (b) nessuna priorità regionale nel ranking; (c) nessuna regola anti-invenzione nel prompt.
- FIX (server.py sezione RAG + core.py):
  - Boost +500 per documenti della regione del giocatore.
  - Cap 15K caratteri per documento: i doc enormi contribuiscono con ESTRATTI attorno alle keyword (`extract_relevant_excerpts` in core.py), così più documenti entrano nel contesto.
  - Dedup per titolo (le guide Lazio/Umbria erano state caricate 2 volte; duplicati categoria "general"/Nazionale rimossi dal DB - risolveva anche leak Umbria->Lazio).
  - Regola 8 "FEDELTÀ ALLE FONTI" nel system prompt: nomi/cariche/luoghi SOLO dai documenti, mai inventati.
- TESTATO (iteration_4.json, 3/3 pass): player Lazio chiede del Siniscalco di Roma -> risposta cita il vero nome+clan (Lasombra) dal PDF; log confermano score Guida Lazio=523; nessun leak Umbria.

## Aggiornamenti (Set 2026 - v16) - Design Document ultima fonte + verifica login
- RAG: il Design Document è ora SEMPRE l'ultimo documento inserito nel contesto (flag is_design_doc nell'ordinamento), a prescindere dallo score. Le cronache regionali e gli altri documenti hanno priorità.
- Login NARRAZIONE ITALIA: verificato funzionante sia via API sia via UI (testing agent, iteration_5.json 2/2 pass). Problema dell'utente non riproducibile: quasi certamente errore di digitazione della password.
- ATTESA: l'utente caricherà il file "PNG, LUOGHI E QUEST" diviso per regione (valutare se suddividerlo per regione nella KB al caricamento).

## Aggiornamenti (Set 2026 - v17) - Riduzione contesto RAG a 30K (controllo costi)
- MAX_CONTEXT_CHARS 50K -> 30K (~7.5K token input di contesto, circa -40% costo per domanda).
- Cronaca della REGIONE del giocatore sempre INTEGRALE (cap 25K); altri documenti come estratti keyword-centered (cap 8K ciascuno).
- extract_relevant_excerpts migliorata: garantisce prima una finestra per OGNI keyword, poi le ripetizioni (evita che una keyword frequente consumi tutto il budget).
- Testato e2e via curl: domanda sul Siniscalco -> risposta corretta (Albornoz y Carvajal, Lasombra) con contesto ridotto. Azioni del test player azzerate dopo il test.

## Aggiornamenti (Set 2026 - v18) - Correzioni da code review
- BUG REALE risolto: /api/session/chat restituiva sempre suggested_challenge=None (hardcoded) -> ora restituisce la prova improvvisata, così il popup appare subito al giocatore.
- Backend: rimossi import inutilizzati (server.py, models.py); tiri prove con secrets.randbelow (crittograficamente sicuro) invece di random; import secrets a livello modulo.
- Frontend: fetch functions di Dashboard/EmbedChat in useCallback con dipendenze corrette negli useEffect (niente stale closures, verificato NESSUN loop di fetch); messaggi chat con id univoci (crypto.randomUUID) come key React; key stabili in NPCsPanel/ChallengesPanel.
- Falsi positivi del report NON applicati (motivati): "hardcoded secret" a server.py:1670 era già secrets.token_urlsafe; i 33 "is vs ==" erano tutti is None/is not None (corretti in Python).
- Deliberatamente rinviati (alto rischio regressione su app funzionante): migrazione token da localStorage a cookie httpOnly, split di AdminPanel/Dashboard in sotto-componenti, refactoring di session_chat in service layer, useMemo/ternari annidati. In backlog.
- Regression test iteration_6.json: 6/6 backend pass, frontend senza loop né errori console. Azioni test player azzerate.

## Aggiornamenti (Set 2026 - v19) - Preparazione pubblicazione
- Check deployment readiness: PASS (nessun blocker: env corrette, CORS ok, nessun hardcoding, compilazione ok).
- Aggiunto SEED IDEMPOTENTE all'avvio (server.py @app.on_event startup): crea i 5 account Narrazione se mancanti (password da variabili SEED_PW_* in backend/.env), indice unico su email, MAI sovrascrive password esistenti. Testato su DB vuoto: 5 account creati, idempotente, password verificate; preview invariata (login 200).
- IMPORTANTE per produzione: il DB di produzione parte vuoto -> gli account Narrazione si auto-creano al primo avvio, ma i PDF della Knowledge Base, le impostazioni personalizzate, i PNG e le prove vanno ricaricati/riconfigurati dal pannello admin sull'app pubblicata. I giocatori si registreranno direttamente sull'app live.

## Aggiornamenti (Set 2026 - v20) - Punti Sangue da PScorrenti
- Il DB esterno ora espone PScorrenti (punti sangue correnti). Uniformato: Punti Sangue = PScorrenti/12 (massimo 12 per tutti) al posto del vecchio campo bloodp.
- Modifiche: sheets.py build_sheet_context (contesto Oracolo) e MySheetModal.jsx (scheda giocatore).
- Risincronizzate le schede salvate dei giocatori collegati (i vecchi snapshot non avevano il campo). Verificato via screenshot: "Punti Sangue 12/12" nella scheda.

## Aggiornamenti (Set 2026 - v21) - Regola Punti Sangue per le Discipline (opzione A: consapevolezza narrativa)
- Nuova regola 9 (OBBLIGATORIA) nel system prompt dell'Oracolo: ogni uso di Disciplina costa 1 PS (max 12, correnti da PScorrenti in scheda), salvo eccezioni da "I Doni del Sangue"; l'Oracolo chiude la risposta con la riga di costo o cita l'eccezione documentata; avverte narrativamente se PS <= 3. Il conteggio ufficiale resta sul gestionale (API esterna di sola lettura, scelta utente: opzione A).
- Testato e2e: uso di "L'Ombra della mano che serve" -> l'Oracolo ha applicato l'eccezione ESATTA dal PDF (riduzione temporanea -1 FdV per 20 minuti) invece del costo standard. Azioni test player azzerate.

## Aggiornamenti (Set 2026 - v22) - Template Word Quest
- Creato TEMPLATE-QUEST-NOTTURNA.docx (compilabile): sezioni Spiegazione Quest, PNG, Luoghi, Oggetti, Prove Contrapposte con tabelle campo/valore e istruzioni (duplicare tabelle, regione obbligatoria, parole chiave, esportare in PDF e caricare in KB).
- Generato con /app/backend/scripts/genera_template_quest.py (python-docx aggiunto a requirements), salvato in MongoDB (upload_files) e scaricabile da /api/uploads/TEMPLATE-QUEST-NOTTURNA.docx. Verificato download e struttura (5 tabelle).
