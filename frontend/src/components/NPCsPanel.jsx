import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  Users,
  Eye,
  EyeOff,
  Lock,
  History,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMPTY_NPC = {
  name: "",
  aliases: [],
  clan: "",
  location: "",
  mood_initial: "Neutrale",
  personality: "",
  knowledge_public: "",
  knowledge_conditional: "",
  knowledge_secret: "",
  triggers_open: "",
  triggers_close: "",
  never_says: "",
  exclusive: false,
  exclusive_rules: "",
};

const MOOD_OPTIONS = ["Ostile", "Diffidente", "Neutrale", "Amichevole", "Servile"];

export default function NPCsPanel({ token }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNpc, setEditingNpc] = useState(null);
  const [form, setForm] = useState(EMPTY_NPC);
  const [aliasInput, setAliasInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [viewingMemory, setViewingMemory] = useState(null);
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    fetchNpcs();
  }, []);

  const fetchNpcs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/npcs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNpcs(await res.json());
    } catch (e) {
      toast.error("Errore nel caricamento PNG");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY_NPC);
    setEditingNpc(null);
    setAliasInput("");
    setShowForm(true);
  };

  const openEdit = (npc) => {
    setForm({
      name: npc.name || "",
      aliases: npc.aliases || [],
      clan: npc.clan || "",
      location: npc.location || "",
      mood_initial: npc.mood_initial || "Neutrale",
      personality: npc.personality || "",
      knowledge_public: npc.knowledge_public || "",
      knowledge_conditional: npc.knowledge_conditional || "",
      knowledge_secret: npc.knowledge_secret || "",
      triggers_open: npc.triggers_open || "",
      triggers_close: npc.triggers_close || "",
      never_says: npc.never_says || "",
      exclusive: npc.exclusive || false,
      exclusive_rules: npc.exclusive_rules || "",
    });
    setEditingNpc(npc);
    setAliasInput("");
    setShowForm(true);
  };

  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v) return;
    if (form.aliases.includes(v)) return;
    setForm({ ...form, aliases: [...form.aliases, v] });
    setAliasInput("");
  };

  const removeAlias = (idx) => {
    setForm({ ...form, aliases: form.aliases.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Il nome del PNG è obbligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingNpc ? `${API}/admin/npcs/${editingNpc.id}` : `${API}/admin/npcs`;
      const method = editingNpc ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editingNpc ? "PNG aggiornato" : "PNG creato");
        setShowForm(false);
        fetchNpcs();
      } else {
        const data = await res.json();
        toast.error(data.detail || "Errore nel salvataggio");
      }
    } catch (e) {
      toast.error("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (npc) => {
    if (!window.confirm(`Eliminare il PNG "${npc.name}"? Anche tutta la sua memoria di interazioni verrà cancellata.`)) return;
    try {
      const res = await fetch(`${API}/admin/npcs/${npc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("PNG eliminato");
        fetchNpcs();
      }
    } catch (e) {
      toast.error("Errore");
    }
  };

  const openMemory = async (npc) => {
    setViewingMemory(npc);
    try {
      const res = await fetch(`${API}/admin/npcs/${npc.id}/interactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setInteractions(await res.json());
    } catch (e) {
      toast.error("Errore caricamento memoria");
    }
  };

  const clearMemory = async () => {
    if (!window.confirm(`Azzerare la memoria di "${viewingMemory.name}"? Tutti gli scambi passati verranno cancellati.`)) return;
    try {
      const res = await fetch(`${API}/admin/npcs/${viewingMemory.id}/interactions`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Memoria azzerata");
        setInteractions([]);
      }
    } catch (e) {
      toast.error("Errore");
    }
  };

  return (
    <div className="space-y-6" data-testid="npcs-panel">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-cinzel text-gold uppercase tracking-widest text-lg">
            Gestione PNG
          </h2>
          <p className="font-body text-muted-foreground text-xs mt-1">
            I PNG creati qui vengono riconosciuti automaticamente quando i giocatori li nominano in chat.
            L'IA userà la loro scheda per restare coerente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
            data-testid="toggle-guide-btn"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {showGuide ? "NASCONDI GUIDA" : "GUIDA"}
          </Button>
          <Button
            onClick={openNew}
            className="bg-gold/20 border border-gold/50 text-gold hover:bg-gold/30 rounded-sm font-cinzel"
            data-testid="new-npc-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUOVO PNG
          </Button>
        </div>
      </div>

      {/* Guide Section */}
      {showGuide && (
        <div className="card-gothic rounded-sm p-6 space-y-4" data-testid="npc-guide">
          <h3 className="font-cinzel text-gold uppercase tracking-widest text-sm">
            Come scrivere un PNG coerente
          </h3>
          <div className="font-body text-sm text-muted-foreground space-y-3">
            <p>
              Più la scheda è <span className="text-gold">strutturata</span>, più l'IA sarà fedele al personaggio.
              Segui questi consigli per ogni campo:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">MOOD INIZIALE</p>
                <p className="text-xs">L'atteggiamento del PNG quando incontra per la prima volta un PG. Es: <em>Diffidente, fissa in silenzio</em></p>
              </div>
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">PERSONALITÀ / TONO</p>
                <p className="text-xs">Come parla e si comporta. Es: <em>Cinico, ironico, frasi brevi, accento romano. Disprezza i Ventrue.</em></p>
              </div>
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">CONOSCENZE PUBBLICHE (Lv. 1)</p>
                <p className="text-xs">Info che rivela con chiunque mostri approccio neutrale. Es: <em>Ieri c'è stata una riunione a Trastevere.</em></p>
              </div>
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">CONOSCENZE CONDIZIONALI (Lv. 2)</p>
                <p className="text-xs">Info che rivela solo se il PG guadagna fiducia (es. prova di Carisma superata). Es: <em>Conosce il nome del Principe ospite.</em></p>
              </div>
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">CONOSCENZE SEGRETE (Lv. 3)</p>
                <p className="text-xs">Info svelate solo con Discipline efficaci o successo critico. Es: <em>Sa dove si nasconde il traditore.</em></p>
              </div>
              <div className="border border-border/30 rounded-sm p-3">
                <p className="text-gold font-cinzel text-xs uppercase mb-2">TRIGGER APERTURA / CHIUSURA</p>
                <p className="text-xs">Cosa lo apre (es. <em>offrire info sui Ventrue</em>) e cosa lo chiude (es. <em>toni arroganti, menzionare il Sabbat</em>)</p>
              </div>
            </div>
            <div className="border border-red-900/50 bg-red-950/20 rounded-sm p-3">
              <p className="text-red-400 font-cinzel text-xs uppercase mb-2">PNG ESCLUSIVO</p>
              <p className="text-xs">
                Se attivato, le interazioni con questo PNG <strong>non sono condivise</strong> con altri PG.
                Ogni PG vive la propria relazione isolata (utile per PNG tutor, mentori segreti, contatti personali).
                Nelle regole scrivi come deve comportarsi quel PNG rispetto all'esclusività (es. <em>"Nega di conoscere altri PG. Se nominato, si finge sorpreso."</em>).
              </p>
            </div>
            <div className="border border-gold/40 bg-gold/5 rounded-sm p-3">
              <p className="text-gold font-cinzel text-xs uppercase mb-2">MEMORIA AUTOMATICA</p>
              <p className="text-xs">
                Ogni volta che un PG dialoga con il PNG (nominandolo in chat), lo scambio viene salvato.
                I PG successivi che incontrano lo stesso PNG vedranno l'IA comportarsi come se il PNG ricordasse
                i precedenti incontri e le informazioni già condivise (a meno che sia ESCLUSIVO).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NPCs List */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Caricamento...</p>
      ) : npcs.length === 0 ? (
        <div className="card-gothic rounded-sm p-8 text-center">
          <Users className="w-12 h-12 text-gold/50 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">
            Nessun PNG creato. Clicca "NUOVO PNG" per iniziare.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className="card-gothic rounded-sm p-4 flex items-start justify-between gap-3 flex-wrap"
              data-testid={`npc-card-${npc.id}`}
            >
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-cinzel text-gold text-base">{npc.name}</h3>
                  {npc.clan && (
                    <span className="text-xs px-2 py-0.5 border border-gold/30 rounded-sm text-gold/80">
                      {npc.clan}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 border border-border/40 rounded-sm text-muted-foreground">
                    {npc.mood_initial}
                  </span>
                  {npc.exclusive && (
                    <span className="text-xs px-2 py-0.5 border border-red-500/50 rounded-sm text-red-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> ESCLUSIVO
                    </span>
                  )}
                </div>
                {npc.aliases && npc.aliases.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-gold/70">Alias:</span> {npc.aliases.join(", ")}
                  </p>
                )}
                {npc.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-gold/70">Luogo:</span> {npc.location}
                  </p>
                )}
                {npc.personality && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {npc.personality}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openMemory(npc)}
                  className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm"
                  data-testid={`memory-npc-${npc.id}`}
                  title="Memoria interazioni"
                >
                  <History className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(npc)}
                  className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm"
                  data-testid={`edit-npc-${npc.id}`}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(npc)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-sm"
                  data-testid={`delete-npc-${npc.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="npc-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold uppercase tracking-widest text-sm">
              {editingNpc ? `Modifica PNG: ${editingNpc.name}` : "Nuovo PNG"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='Es. Marco "Il Corvo" Valenti'
                  className="input-gothic rounded-sm"
                  required
                  data-testid="npc-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Clan</Label>
                <Input
                  value={form.clan}
                  onChange={(e) => setForm({ ...form, clan: e.target.value })}
                  placeholder="Es. Nosferatu"
                  className="input-gothic rounded-sm"
                  data-testid="npc-clan-input"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Luogo abituale</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Es. Trastevere, Bar Il Pozzo"
                  className="input-gothic rounded-sm"
                  data-testid="npc-location-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Mood iniziale</Label>
                <Select value={form.mood_initial} onValueChange={(v) => setForm({ ...form, mood_initial: v })}>
                  <SelectTrigger className="input-gothic rounded-sm" data-testid="npc-mood-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {MOOD_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Aliases */}
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Alias / Soprannomi</Label>
              <p className="text-xs text-muted-foreground">Nomi alternativi con cui i PG possono chiamare il PNG (es. "Il Corvo", "Valenti")</p>
              <div className="flex gap-2">
                <Input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
                  placeholder="Aggiungi alias e premi Invio"
                  className="input-gothic rounded-sm"
                  data-testid="npc-alias-input"
                />
                <Button type="button" onClick={addAlias} variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {form.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.aliases.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-1 border border-gold/30 rounded-sm text-gold/80 flex items-center gap-1">
                      {a}
                      <button type="button" onClick={() => removeAlias(i)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Personality */}
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Personalità / Tono di voce</Label>
              <Textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                placeholder="Es. Cinico, ironico, frasi brevi, accento romanesco. Disprezza i Ventrue. Parla solo quando è strettamente necessario."
                className="input-gothic rounded-sm min-h-[80px]"
                data-testid="npc-personality-input"
              />
            </div>

            {/* Knowledge Levels */}
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Conoscenze Pubbliche (Livello 1)</Label>
              <p className="text-xs text-muted-foreground">Info che rivela con chi mostra approccio neutrale</p>
              <Textarea
                value={form.knowledge_public}
                onChange={(e) => setForm({ ...form, knowledge_public: e.target.value })}
                placeholder="Es. Sa che ieri c'è stata una riunione a Trastevere. Conosce i nomi dei negozianti della zona."
                className="input-gothic rounded-sm min-h-[70px]"
                data-testid="npc-knowledge-public-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Conoscenze Condizionali (Livello 2)</Label>
              <p className="text-xs text-muted-foreground">Info che rivela solo con fiducia guadagnata o prova superata</p>
              <Textarea
                value={form.knowledge_conditional}
                onChange={(e) => setForm({ ...form, knowledge_conditional: e.target.value })}
                placeholder="Es. Conosce il nome del Principe ospite. Ha visto un Ventrue entrare nel magazzino ieri notte."
                className="input-gothic rounded-sm min-h-[70px]"
                data-testid="npc-knowledge-conditional-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Conoscenze Segrete (Livello 3)</Label>
              <p className="text-xs text-muted-foreground">Info svelate SOLO con Discipline efficaci o successo critico</p>
              <Textarea
                value={form.knowledge_secret}
                onChange={(e) => setForm({ ...form, knowledge_secret: e.target.value })}
                placeholder="Es. Sa dove si nasconde il traditore. Conosce il vero nome del suo sire."
                className="input-gothic rounded-sm min-h-[70px]"
                data-testid="npc-knowledge-secret-input"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Cosa lo apre</Label>
                <Textarea
                  value={form.triggers_open}
                  onChange={(e) => setForm({ ...form, triggers_open: e.target.value })}
                  placeholder="Es. Offrire info sui Ventrue, mostrare rispetto per i Nosferatu"
                  className="input-gothic rounded-sm min-h-[60px]"
                  data-testid="npc-triggers-open-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Cosa lo chiude</Label>
                <Textarea
                  value={form.triggers_close}
                  onChange={(e) => setForm({ ...form, triggers_close: e.target.value })}
                  placeholder="Es. Toni arroganti, menzionare il Sabbat, promesse vuote"
                  className="input-gothic rounded-sm min-h-[60px]"
                  data-testid="npc-triggers-close-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Cose che non dirà mai</Label>
              <Textarea
                value={form.never_says}
                onChange={(e) => setForm({ ...form, never_says: e.target.value })}
                placeholder="Es. Il nome del suo sire. La posizione del rifugio dei Nosferatu."
                className="input-gothic rounded-sm min-h-[60px]"
                data-testid="npc-never-says-input"
              />
            </div>

            {/* Exclusive */}
            <div className="border-2 border-red-900/50 bg-red-950/10 rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-cinzel text-red-400 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-4 h-4" /> PNG ESCLUSIVO
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se attivo, le interazioni con questo PNG non vengono condivise con altri PG.
                  </p>
                </div>
                <Select
                  value={form.exclusive ? "yes" : "no"}
                  onValueChange={(v) => setForm({ ...form, exclusive: v === "yes" })}
                >
                  <SelectTrigger className="w-24 input-gothic rounded-sm" data-testid="npc-exclusive-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Sì</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.exclusive && (
                <div className="space-y-2">
                  <Label className="font-cinzel text-red-400 text-xs uppercase">Regole di esclusività</Label>
                  <p className="text-xs text-muted-foreground">
                    Scrivi come il PNG deve comportarsi rispetto all'esclusività: cosa negare, cosa fingere, come reagire se altri PG vengono nominati.
                  </p>
                  <Textarea
                    value={form.exclusive_rules}
                    onChange={(e) => setForm({ ...form, exclusive_rules: e.target.value })}
                    placeholder={'Es. "Nega di conoscere altri PG. Se il PG menziona un altro PG, si finge sorpreso: non ha mai parlato con nessun altro. Si comporta come se questo fosse l\'unico PG con cui ha contatti."'}
                    className="input-gothic rounded-sm min-h-[100px]"
                    data-testid="npc-exclusive-rules-input"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-border text-muted-foreground hover:bg-border/20 rounded-sm font-cinzel"
                data-testid="npc-cancel-btn"
              >
                ANNULLA
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gold/20 border border-gold/50 text-gold hover:bg-gold/30 rounded-sm font-cinzel"
                data-testid="npc-submit-btn"
              >
                {submitting ? "SALVATAGGIO..." : editingNpc ? "AGGIORNA" : "CREA PNG"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Memory Dialog */}
      <Dialog open={!!viewingMemory} onOpenChange={(open) => !open && setViewingMemory(null)}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="npc-memory-dialog">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-gold uppercase tracking-widest text-sm flex items-center justify-between">
              <span>Memoria di {viewingMemory?.name}</span>
              {interactions.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={clearMemory}
                  className="bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-900/50 rounded-sm font-cinzel text-xs"
                  data-testid="clear-memory-btn"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> AZZERA
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {interactions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nessuna interazione registrata con questo PNG.
              </p>
            ) : (
              interactions.map((i) => (
                <div key={i.id} className="border border-border/40 rounded-sm p-3 space-y-2" data-testid={`interaction-${i.id}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-cinzel text-gold text-xs uppercase">{i.user_name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString("it-IT")}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gold/70 mb-1">PG:</p>
                    <p className="text-sm text-muted-foreground">«{i.user_message}»</p>
                  </div>
                  <div>
                    <p className="text-xs text-gold/70 mb-1">{viewingMemory?.name}:</p>
                    <p className="text-sm text-foreground">«{i.npc_response}»</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
