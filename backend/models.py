from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    player_name: str
    character_name: str
    region: Optional[str] = None

REGIONS = ["Lazio", "Abruzzo", "Umbria", "Lombardia"]
KB_REGIONS = REGIONS + ["Nazionale"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    role: str
    max_actions: int
    used_actions: int
    is_super_admin: bool = False
    blocked: bool = False
    region: Optional[str] = None
    sheet_id: Optional[str] = None
    sheet_name: Optional[str] = None
    player_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    file_type: Optional[str] = "text"
    file_url: Optional[str] = None
    region: Optional[str] = "Nazionale"
    required_fama_vampiri: Optional[int] = None
    required_fama_mondo_oscuro: Optional[int] = None
    # Restrizioni di accesso opzionali
    required_contacts: Optional[List[dict]] = None
    required_mentor: Optional[int] = None
    required_notoriety: Optional[int] = None

class KnowledgeBaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    file_type: str
    file_url: Optional[str]
    created_at: str
    created_by: str
    region: Optional[str] = "Nazionale"
    required_fama_vampiri: Optional[int] = None
    required_fama_mondo_oscuro: Optional[int] = None
    required_contacts: Optional[List[dict]] = None
    required_mentor: Optional[int] = None
    required_notoriety: Optional[int] = None

class ChatRequest(BaseModel):
    question: str

class FoundResourceItem(BaseModel):
    """Oggetto RISORSE trovato durante la chat"""
    id: str
    name: str
    description: Optional[str] = None
    cost_resources: int

class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    question: str
    answer: str
    created_at: str
    type: Optional[str] = "chat"
    challenge_data: Optional[dict] = None
    found_items: Optional[List[FoundResourceItem]] = None  # Oggetti trovabili/acquistabili
    edited: Optional[bool] = False
    edited_by: Optional[str] = None
    edited_at: Optional[str] = None

class UpdateUserActions(BaseModel):
    max_actions: int

class UpdateUserRole(BaseModel):
    role: str

class BlockUserRequest(BaseModel):
    blocked: bool

class UpdateUserRegion(BaseModel):
    region: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class LinkSheetRequest(BaseModel):
    sheet_id: Optional[str] = None

class EditAnswerRequest(BaseModel):
    answer: str

class AppSettings(BaseModel):
    event_name: str = "L'Archivio Maledetto"
    event_logo_url: Optional[str] = None
    primary_color: str = "#8a0000"
    secondary_color: str = "#000033"
    accent_color: str = "#b8860b"
    background_color: str = "#050505"
    # Hero texts
    hero_title: str = "Svela i Segreti"
    hero_subtitle: str = "dell'Antico Sapere"
    hero_description: str = "Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano."
    # Chat texts
    chat_placeholder: str = "Poni la tua domanda all'Oracolo..."
    oracle_name: str = "L'Oracolo"
    chat_waiting_message: str = "è in attesa"
    chat_loading_message: str = "Consulto gli antichi tomi..."
    # Navigation texts
    nav_archive: str = "ARCHIVIO"
    nav_admin: str = "ADMIN"
    nav_logout: str = "ESCI"
    nav_aids: str = "FOCALIZZAZIONI"
    nav_background: str = "BACKGROUND"
    nav_background: str = "BACKGROUND"
    # Aids/Focalizzazioni texts
    aids_title: str = "Focalizzazioni degli Attributi"
    aids_subtitle: str = "Inserisci il valore del tuo attributo per vedere le focalizzazioni disponibili"
    aids_no_active: str = "Nessuna focalizzazione attiva in questo momento"
    aids_no_active_desc: str = "Le focalizzazioni sono disponibili solo durante gli eventi dal vivo"
    aids_obtained: str = "Focalizzazione Ottenuta"
    aids_input_label: str = "Inserisci il tuo valore di"
    # Challenge texts
    challenge_title: str = "Prova Richiesta"
    challenge_success: str = "Successo!"
    challenge_tie: str = "Parità"
    challenge_failure: str = "Fallimento"
    challenge_roll_btn: str = "LANCIA I DADI"
    # Archive texts
    archive_title: str = "Le Tue Consultazioni"
    archive_select: str = "Seleziona una consultazione"
    archive_select_desc: str = "Clicca su una delle tue domande passate per visualizzare i dettagli della consultazione."
    # Actions texts
    actions_exhausted: str = "Hai esaurito le tue azioni disponibili"
    # Auth texts  
    auth_login_title: str = "Accedi"
    auth_register_title: str = "Registrati"
    auth_login_btn: str = "ENTRA NELL'ARCHIVIO"
    auth_register_btn: str = "UNISCITI ALL'ARCHIVIO"
    # Landing texts
    landing_cta: str = "INIZIA IL TUO VIAGGIO"
    landing_feature1_title: str = "Interroga l'Oracolo"
    landing_feature1_desc: str = "Poni le tue domande all'intelligenza arcana che custodisce le conoscenze dell'evento."
    landing_feature2_title: str = "Archivio Personale"
    landing_feature2_desc: str = "Ogni tua domanda e risposta viene conservata nel tuo archivio personale per futura consultazione."
    landing_feature3_title: str = "Azioni Limitate"
    landing_feature3_desc: str = "Ogni giocatore ha un numero limitato di azioni. Usa saggiamente il tuo potere di interrogazione."
    background_image_url: Optional[str] = None
    # Finestra temporale macro evento live (opzionale)
    event_window_start: Optional[str] = None
    event_window_end: Optional[str] = None
    # Tono personalizzato dell'Oracolo (vuoto = standard)
    oracle_tone: str = ""
    # Link PayPal (gestito da NARRAZIONE ITALIA)
    paypal_link: str = ""

class AppSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_name: str
    event_logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    hero_title: str
    hero_subtitle: str
    hero_description: str
    chat_placeholder: str
    oracle_name: str
    chat_waiting_message: Optional[str] = "è in attesa"
    chat_loading_message: Optional[str] = "Consulto gli antichi tomi..."
    nav_archive: Optional[str] = "ARCHIVIO"
    nav_admin: Optional[str] = "ADMIN"
    nav_logout: Optional[str] = "ESCI"
    nav_aids: Optional[str] = "FOCALIZZAZIONI"
    nav_background: Optional[str] = "BACKGROUND"
    nav_background: Optional[str] = "BACKGROUND"
    background_image_url: Optional[str] = None
    event_window_start: Optional[str] = None
    event_window_end: Optional[str] = None
    oracle_tone: Optional[str] = ""
    paypal_link: Optional[str] = ""
    aids_title: Optional[str] = "Focalizzazioni degli Attributi"
    aids_subtitle: Optional[str] = "Inserisci il valore del tuo attributo per vedere le focalizzazioni disponibili"
    aids_no_active: Optional[str] = "Nessuna focalizzazione attiva in questo momento"
    aids_no_active_desc: Optional[str] = "Le focalizzazioni sono disponibili solo durante gli eventi dal vivo"
    aids_obtained: Optional[str] = "Focalizzazione Ottenuta"
    aids_input_label: Optional[str] = "Inserisci il tuo valore di"
    challenge_title: Optional[str] = "Prova Richiesta"
    challenge_success: Optional[str] = "Successo!"
    challenge_tie: Optional[str] = "Parità"
    challenge_failure: Optional[str] = "Fallimento"
    challenge_roll_btn: Optional[str] = "LANCIA I DADI"
    archive_title: Optional[str] = "Le Tue Consultazioni"
    archive_select: Optional[str] = "Seleziona una consultazione"
    archive_select_desc: Optional[str] = "Clicca su una delle tue domande passate per visualizzare i dettagli della consultazione."
    actions_exhausted: Optional[str] = "Hai esaurito le tue azioni disponibili"
    auth_login_title: Optional[str] = "Accedi"
    auth_register_title: Optional[str] = "Registrati"
    auth_login_btn: Optional[str] = "ENTRA NELL'ARCHIVIO"
    auth_register_btn: Optional[str] = "UNISCITI ALL'ARCHIVIO"
    landing_cta: Optional[str] = "INIZIA IL TUO VIAGGIO"
    landing_feature1_title: Optional[str] = "Interroga l'Oracolo"
    landing_feature1_desc: Optional[str] = "Poni le tue domande all'intelligenza arcana che custodisce le conoscenze dell'evento."
    landing_feature2_title: Optional[str] = "Archivio Personale"
    landing_feature2_desc: Optional[str] = "Ogni tua domanda e risposta viene conservata nel tuo archivio personale per futura consultazione."
    landing_feature3_title: Optional[str] = "Azioni Limitate"
    landing_feature3_desc: Optional[str] = "Ogni giocatore ha un numero limitato di azioni. Usa saggiamente il tuo potere di interrogazione."
    background_image_url: Optional[str]
    event_window_start: Optional[str] = None
    event_window_end: Optional[str] = None

# ==================== PNG (NPC) MODELS ====================

class NPCCreate(BaseModel):
    """PNG: Personaggio Non Giocante gestito dalla Narrazione"""
    name: str
    aliases: Optional[List[str]] = []  # nomi alternativi/soprannomi con cui i PG possono riferirsi al PNG
    clan: Optional[str] = None
    location: Optional[str] = None  # dove si trova di solito
    mood_initial: str = "Neutrale"  # Ostile, Diffidente, Neutrale, Amichevole, Servile
    personality: str = ""  # tono di voce, tratti caratteriali, stile di parlata
    knowledge_public: Optional[str] = ""  # info accessibili a tutti con approccio neutro
    knowledge_conditional: Optional[str] = ""  # info disponibili con fiducia guadagnata / prova superata
    knowledge_secret: Optional[str] = ""  # info rivelabili SOLO con Discipline efficaci / successo critico
    triggers_open: Optional[str] = None  # cosa apre il PNG
    triggers_close: Optional[str] = None  # cosa chiude il PNG
    never_says: Optional[str] = None  # cose che non dirà mai
    exclusive: bool = False  # se True, le interazioni non sono visibili ad altri PG
    exclusive_rules: Optional[str] = None  # regole personalizzate per PNG esclusivi

class NPCUpdate(BaseModel):
    name: Optional[str] = None
    aliases: Optional[List[str]] = None
    clan: Optional[str] = None
    location: Optional[str] = None
    mood_initial: Optional[str] = None
    personality: Optional[str] = None
    knowledge_public: Optional[str] = None
    knowledge_conditional: Optional[str] = None
    knowledge_secret: Optional[str] = None
    triggers_open: Optional[str] = None
    triggers_close: Optional[str] = None
    never_says: Optional[str] = None
    exclusive: Optional[bool] = None
    exclusive_rules: Optional[str] = None

class NPCResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    aliases: List[str] = []
    clan: Optional[str] = None
    location: Optional[str] = None
    mood_initial: str
    personality: str
    knowledge_public: Optional[str] = ""
    knowledge_conditional: Optional[str] = ""
    knowledge_secret: Optional[str] = ""
    triggers_open: Optional[str] = None
    triggers_close: Optional[str] = None
    never_says: Optional[str] = None
    exclusive: bool = False
    exclusive_rules: Optional[str] = None
    created_at: str
    updated_at: str

class NPCInteractionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    npc_id: str
    npc_name: str
    user_id: str
    user_name: str
    user_message: str
    npc_response: str
    created_at: str

# ==================== PROVE LARP MODELS ====================

class ContrastingTest(BaseModel):
    attribute: str  # es. "Intelligenza + Occulto"
    difficulty: int  # es. 7
    success_text: str
    tie_text: str
    failure_text: str
    knowledge_type: Optional[str] = None  # Tipologia di conoscenze per il conteggio trimestrale

class ChallengeCreate(BaseModel):
    name: str  # es. "Antico tomo sulla scrivania"
    description: str  # Descrizione situazione
    tests: List[ContrastingTest]  # Array di prove contrapposte
    keywords: List[str] = []  # parole chiave per attivare
    allow_refuge_defense: bool = False  # se true, il rifugio può ridurre la difficoltà
    allow_followers_help: bool = True  # se true, i seguaci possono aiutare in questa prova

class ChallengeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    tests: List[dict]
    keywords: List[str]
    allow_refuge_defense: bool = False
    allow_followers_help: bool = True
    created_at: str
    created_by: str

class ChallengeAttempt(BaseModel):
    challenge_id: str
    test_index: int  # quale prova ha scelto (0, 1, 2...)
    player_value: int  # valore attributo del giocatore
    use_refuge: bool = False  # se il PG vuole usare il proprio rifugio difensivo
    followers_to_use: int = 0  # quanti punti SEGUACI il PG vuole usare per questa prova
    equipment_id: Optional[str] = None  # ID del lock dell'oggetto da usare (dall'equipaggiamento)

class BackgroundContact(BaseModel):
    name: str
    value: int

# Modelli per Discipline e Poteri
class DisciplinePower(BaseModel):
    """Un singolo potere all'interno di una disciplina"""
    name: str
    level: int  # Livello del potere (1-5)

class Discipline(BaseModel):
    """Una disciplina del PG con i suoi poteri"""
    name: str  # Es. "Auspex", "Dominazione", "Potenza"
    powers: List[DisciplinePower] = []  # Lista dei poteri posseduti

class Via(BaseModel):
    """Una Via Taumaturgica o Necromantica"""
    name: str  # Es. "Via del Sangue", "Via dei Sepolcri"
    type: str  # "taumaturgica" o "necromantica"
    powers: List[DisciplinePower] = []

class Ritual(BaseModel):
    """Un rituale Taumaturgico o Necromantico"""
    name: str
    level: int  # Livello del rituale (1-6 per Taumaturgia, 1-5 per Necromanzia)
    type: str  # "taumaturgico" o "necromantico"

class Background(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    clan: Optional[str] = None  # Clan di appartenenza del PG
    risorse: int = 0
    seguaci: int = 0
    rifugio: int = 1
    mentor: int = 0
    notoriety: int = 0
    alleati: int = 0
    gregge: int = 0
    fama_citta: int = 0
    fama_vampiri: int = 0
    fama_mondo_oscuro: int = 0
    contacts: List[BackgroundContact] = []
    # Nuovi campi per Discipline e Poteri
    disciplines: List[Discipline] = []  # Discipline possedute (Auspex, Dominazione, etc.)
    vie: List[Via] = []  # Vie Taumaturgiche o Necromantiche
    rituals: List[Ritual] = []  # Rituali conosciuti
    locked_for_player: bool = False

# ==================== AIUTI ATTRIBUTO MODELS ====================
# ==================== RISORSE & SEGUACI SUPPORT ====================

class ResourceItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cost_resources: int = 1
    block_until: Optional[str] = None  # ISO datetime (opzionale)
    total_quantity: Optional[int] = None  # Null = illimitato
    max_per_player: Optional[int] = None  # Null = illimitato
    is_public: bool = True  # Se False, non appare nel catalogo ma può essere trovato tramite IA
    location_keywords: Optional[str] = None  # Keywords per matching con KB (es. "magazzino, portuense")
    uses: Optional[int] = None  # Numero di utilizzi (Null = illimitato)
    bonus: Optional[int] = None  # Bonus al valore del PG nelle prove
    malus: Optional[int] = None  # Malus al valore del PG nelle prove
    bonus_attribute: Optional[str] = None  # Attributo per cui vale il bonus/malus (es. "DESTREZZA + ARMI DA FUOCO")

class ResourceItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cost_resources: Optional[int] = None
    block_until: Optional[str] = None
    total_quantity: Optional[int] = None
    max_per_player: Optional[int] = None
    is_public: Optional[bool] = None
    location_keywords: Optional[str] = None
    uses: Optional[int] = None
    bonus: Optional[int] = None
    malus: Optional[int] = None
    bonus_attribute: Optional[str] = None

class ResourceItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    cost_resources: int
    block_until: Optional[str] = None
    total_quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    max_per_player: Optional[int] = None
    is_public: bool = True
    location_keywords: Optional[str] = None
    uses: Optional[int] = None
    bonus: Optional[int] = None
    malus: Optional[int] = None
    bonus_attribute: Optional[str] = None

class ResourceAvailableResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    total_resources: int
    locked_resources: int
    available_resources: int
    items: List[ResourceItemResponse]

class ResourcePurchaseRequest(BaseModel):
    item_id: str
class FollowerStatus(BaseModel):
    total_followers: int
    spent_followers: int
    available_followers: int
    remaining_actions_before: int
    effective_max_actions: int





class AidLevel(BaseModel):
    level: int  # 2, 4, o 5
    level_name: str  # "minore", "medio", "maggiore"
    text: str  # testo dell'aiuto

class AidCreate(BaseModel):
    name: str  # es. "Collegamento Intelligenza"
    attribute: str  # es. "Intelligenza"
    levels: List[AidLevel]  # array di livelli con testi
    event_date: str  # data inizio (YYYY-MM-DD)
    end_date: Optional[str] = None  # data fine (YYYY-MM-DD), opzionale
    start_time: str  # ora inizio (HH:MM)
    end_time: str  # ora fine (HH:MM)

class AidResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    attribute: str
    levels: List[dict]
    event_date: str
    end_date: Optional[str] = None
    start_time: str
    end_time: str
    created_at: str
    created_by: str

class UseAid(BaseModel):
    aid_id: str
    level: int  # quale livello sta usando (2, 4 o 5)
    player_attribute_value: int  # valore attributo del giocatore

# ==================== SESSIONI DI CONSULTAZIONE ====================

class ConsultationSession(BaseModel):
    """Una sessione di consultazione che può contenere più scambi domanda/risposta"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    context: str  # Contesto corrente (es. "quartiere:Ostiense", "luogo:magazzino")
    is_active: bool = True
    started_at: str
    ended_at: Optional[str] = None
    messages_count: int = 0

class ConsultationMessage(BaseModel):
    """Un singolo messaggio all'interno di una sessione"""
    id: str
    session_id: str
    user_id: str
    role: str  # "user" o "assistant"
    content: str
    created_at: str

class WorldEvent(BaseModel):
    """Un evento nel mondo di gioco (oggetto preso, luogo visitato, etc.)"""
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str  # "object_taken", "location_visited", "object_placed"
    user_id: str
    user_name: str  # Nome del PG per le visioni
    location: str  # Luogo dell'evento
    object_name: Optional[str] = None  # Nome oggetto se applicabile
    description: Optional[str] = None
    created_at: str

class StartSessionRequest(BaseModel):
    context: Optional[str] = None  # Contesto iniziale opzionale

class EndSessionRequest(BaseModel):
    session_id: str

class SessionChatRequest(BaseModel):
    session_id: Optional[str] = None  # Se None, crea nuova sessione
    message: str

class SessionChatResponse(BaseModel):
    session_id: str
    is_new_session: bool
    response: str
    context: str
    found_items: List[FoundResourceItem] = []
    suggested_challenge: Optional[dict] = None  # Se l'IA suggerisce una prova
    session_ended: bool = False  # Se la sessione è stata chiusa
