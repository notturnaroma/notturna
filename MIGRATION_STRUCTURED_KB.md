# NOTTURNA — migrazione Knowledge Base strutturata

## Obiettivo
Migrare gradualmente l'Oracolo dalla Knowledge Base composta da PDF/testo concatenato a record regionali strutturati, senza interrompere l'app Emergent attuale e senza perdere lo storico.

## Sicurezza del rollout
- `main` resta il ramo della versione attuale.
- Il pilot vive su `migration/structured-kb-lazio`.
- `/api/chat` legacy non viene modificato.
- Il pilot espone `/api/oracle-v2/chat` tramite l'entrypoint `structured_server:app`.
- I dati strutturati usano `structured_knowledge`; non cancellano `knowledge_base`, `chat_history` o le schede.
- Le rotte admin strutturate applicano gli stessi limiti regionali della Knowledge Base legacy.

## Variabili ambiente richieste
Il pilot riusa la configurazione esistente del backend. Devono essere presenti almeno:
- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `EMERGENT_LLM_KEY`

Il frontend deve avere `REACT_APP_BACKEND_URL` puntato al backend pilot.

## Avvio pilot backend
Dalla cartella `backend`:

```bash
uvicorn structured_server:app --host 0.0.0.0 --port 8001
```

La porta 8001 consente di eseguire il pilot accanto al backend legacy durante il collaudo.

## Importazione regione
### Interfaccia Narrazione
Aprire `/admin/structured-kb`, selezionare la regione e caricare l'export JSON. La stessa schermata mostra conteggi e preview del retrieval senza chiamare l'AI.

### API admin
`POST /api/structured-kb/import` con il JSON regionale come body.

### CLI
```bash
python import_structured_json.py /percorso/notturna_lazio_import_v1.json
```

L'import è idempotente: aggiorna i record della regione e rimuove dalla sola collection strutturata quelli non più presenti nell'export.

## Verifica LAZIO dopo import
Dalla cartella `backend`:

```bash
python scripts/verify_structured_kb.py Lazio
```

Il controllo non usa il modello e non consuma azioni PG. Per il dataset pilota verifica anche i conteggi attesi e retrieval significativi.

## Oracle v2
Interfaccia PG: `/oracle-v2`

API: `POST /api/oracle-v2/chat`

Flusso:
1. identifica la regione del PG;
2. recupera soltanto i record regionali pertinenti;
3. aggiunge le Regole Operative dell'Oracolo;
4. aggiunge la scheda ufficiale del PG;
5. se la richiesta riguarda una Disciplina recupera `I DONI DEL SANGUE` dalla KB legacy;
6. aggiunge lo storico recente del PG per mantenere continuità;
7. invia al modello il contesto mirato;
8. registra nella `chat_history` i record effettivamente consultati.

## Regola Discipline
- Scheda PG = cosa possiede il personaggio.
- `I DONI DEL SANGUE` = come funziona la Disciplina.
- Record regionale = come la Disciplina interagisce con la specifica situazione.

## Storico
Oracle v2 legge lo storico precedente e continua a scrivere nella stessa `chat_history`. Le nuove risposte hanno `type: oracle_v2`, regione, ID/titoli dei record strutturati consultati e indicazione dell'eventuale uso di `I DONI DEL SANGUE`.

## CI
La workflow `.github/workflows/oracle-v2-checks.yml` esegue:
- test puri del parser/retrieval strutturato;
- build del frontend.

I test end-to-end con MongoDB e modello restano da eseguire nell'ambiente di staging perché richiedono configurazione e servizi reali.

## Checklist prima del merge
1. Avviare `structured_server:app` su staging.
2. Importare il JSON LAZIO da `/admin/structured-kb`.
3. Eseguire `python scripts/verify_structured_kb.py Lazio`.
4. Usare la preview admin su Quest, PNG, PG pubblici, Luoghi, Oggetti e Prove.
5. Testare `/oracle-v2` con un account PG Lazio.
6. Verificare richieste chiare, richieste ambigue, informazioni riservate e Discipline.
7. Controllare che le azioni siano conteggiate correttamente.
8. Controllare che lo storico legacy sia utilizzabile e che le nuove risposte siano marcate `oracle_v2`.
9. Solo dopo il collaudo decidere se sostituire il flusso principale o mantenere temporaneamente i due endpoint.
10. Ripetere lo stesso processo per le altre regioni.
