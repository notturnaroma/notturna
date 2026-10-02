# NOTTURNA — migrazione Knowledge Base strutturata

## Obiettivo
Migrare gradualmente l'Oracolo dalla Knowledge Base composta da PDF/testo concatenato a record regionali strutturati, senza interrompere l'app Emergent attuale e senza perdere lo storico.

## Sicurezza del rollout
- `main` resta il ramo della versione attuale.
- Il pilot vive su `migration/structured-kb-lazio`.
- `/api/chat` legacy non viene modificato.
- Il pilot espone `/api/oracle-v2/chat` solo tramite l'entrypoint `structured_server:app`.
- I dati strutturati usano la collection MongoDB `structured_knowledge`; non cancellano `knowledge_base`, `chat_history` o le schede.

## Avvio pilot backend
Dalla cartella `backend` usare l'entrypoint ASGI:

```bash
uvicorn structured_server:app --host 0.0.0.0 --port 8001
```

La porta 8001 è suggerita per eseguire il pilot accanto al backend legacy durante i test.

## Importazione regione
Sono disponibili due modalità.

### API admin
`POST /api/structured-kb/import` con il JSON regionale come body.

### CLI
```bash
python import_structured_json.py /percorso/notturna_lazio_import_v1.json
```

L'import è idempotente: i record della regione vengono aggiornati e quelli non più presenti nell'export vengono rimossi soltanto dalla collection strutturata di quella regione.

## Controlli admin
- `GET /api/structured-kb/stats/Lazio`
- `GET /api/structured-kb/preview/Lazio?q=<richiesta>`

La preview mostra i record recuperati senza chiamare il modello e senza consumare azioni PG.

## Oracle v2
`POST /api/oracle-v2/chat`

Il flusso è:
1. identifica la regione del PG;
2. recupera i record regionali più pertinenti;
3. aggiunge le Regole Operative dell'Oracolo;
4. aggiunge la scheda ufficiale del PG;
5. quando la richiesta riguarda una Disciplina, recupera `I DONI DEL SANGUE` dalla KB legacy come fonte obbligatoria;
6. invia al modello soltanto questo contesto mirato.

## Regola Discipline
- Scheda PG = cosa possiede il personaggio.
- `I DONI DEL SANGUE` = come funziona la Disciplina.
- Record regionale = come la Disciplina interagisce con la specifica situazione.

## Storico
La migrazione non sostituisce `chat_history`. Le risposte Oracle v2 vengono salvate nella stessa collection con `type: oracle_v2` e con gli ID dei record strutturati usati. Lo storico già prodotto dalla versione Emergent resta quindi disponibile.

## Passi prima del merge
1. Importare il JSON LAZIO in un database di staging/test.
2. Verificare i conteggi della regione.
3. Eseguire query di retrieval su Quest, PNG, Luoghi, Oggetti e Prove.
4. Confrontare le risposte Oracle v2 con casi noti.
5. Verificare specificamente richieste ambigue, informazioni riservate e Discipline.
6. Solo dopo il collaudo, collegare il frontend a `/api/oracle-v2/chat` o integrare il retrieval in `/api/chat`.
7. Ripetere l'import per le altre regioni usando lo stesso schema.
