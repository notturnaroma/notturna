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
  src="https://smart-chatbot-71.preview.emergentagent.com/embed" 
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
