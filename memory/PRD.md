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

## Backlog corrente
- P1: Refactoring `server.py` in moduli separati (>2700 righe)
- P2: Campo "Manifesto dell'Oracolo" nel pannello UI per modificare system prompt senza toccare codice
- P2: Inserimento loghi forniti dall'utente (in arrivo)
- P2: Validazione RAG con le nuove schede LUOGHI/PNG/OGGETTI quando l'utente le caricherà

