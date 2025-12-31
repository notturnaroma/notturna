import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Swords,
  ChevronDown,
  ChevronUp,
  Save,
  X
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyTest = {
  attribute: "",
  difficulty: 7,
  success_text: "",
  tie_text: "",
  failure_text: ""
};

const defaultAllowRefuge = false;

export default function ChallengesPanel({ token }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedChallenge, setExpandedChallenge] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    keywords: "",
    allow_refuge_defense: defaultAllowRefuge,
    tests: [{ ...emptyTest }]
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch(`${API}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setChallenges(await response.json());
      }
    } catch (error) {
      toast.error("Errore nel caricamento prove");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      keywords: "",
      allow_refuge_defense: defaultAllowRefuge,
      tests: [{ ...emptyTest }]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (challenge) => {
    setFormData({
      name: challenge.name,
      description: challenge.description,
      keywords: challenge.keywords.join(", "),
      allow_refuge_defense: challenge.allow_refuge_defense || false,
      tests: challenge.tests
    });
    setEditingId(challenge.id);
    setShowForm(true);
  };

  const addTest = () => {
    setFormData(prev => ({
      ...prev,
      tests: [...prev.tests, { ...emptyTest }]
    }));
  };

  const removeTest = (index) => {
    if (formData.tests.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index)
    }));
  };

  const updateTest = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tests: prev.tests.map((t, i) => 
        i === index ? { ...t, [field]: value } : t
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Nome e descrizione sono obbligatori");
      return;
    }
    
    for (let i = 0; i < formData.tests.length; i++) {
      const t = formData.tests[i];
      if (!t.attribute.trim() || !t.success_text.trim() || !t.tie_text.trim() || !t.failure_text.trim()) {
        toast.error(`Completa tutti i campi della Prova ${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    
    const payload = {
      name: formData.name,
      description: formData.description,
      keywords: formData.keywords.split(",").map(k => k.trim()).filter(k => k),
      allow_refuge_defense: !!formData.allow_refuge_defense,
      tests: formData.tests.map(t => ({
        ...t,
        difficulty: parseInt(t.difficulty) || 7
      }))
    };

    try {
      const url = editingId 
        ? `${API}/challenges/${editingId}`
        : `${API}/challenges`;
      
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingId ? "Prova aggiornata!" : "Prova creata!");
        resetForm();
        fetchChallenges();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Errore");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa prova?")) return;

    try {
      const response = await fetch(`${API}/challenges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Prova eliminata");
        fetchChallenges();
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-gold" />
          <h2 className="font-cinzel text-xl text-gold uppercase tracking-widest">
            Prove LARP
          </h2>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
          data-testid="new-challenge-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          NUOVA PROVA
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gothic rounded-sm p-6 border-2 border-gold/30" data-testid="challenge-form">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-cinzel text-gold uppercase tracking-widest text-sm">
              {editingId ? "Modifica Prova" : "Nuova Prova"}
            </h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info base */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nome Situazione *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Antico tomo sulla scrivania"
                  className="input-gothic rounded-sm"
                  data-testid="challenge-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Parole chiave (separate da virgola)</Label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="es. tomo, libro, scrivania"
                  className="input-gothic rounded-sm"
                  data-testid="challenge-keywords"
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Questa prova può nuocere al PG (usa RIFUGIO come difesa)</Label>
              <div className="flex items-center gap-2 text-sm text-parchment">
                <input
                  id="allow_refuge_defense"
                  type="checkbox"
                  checked={formData.allow_refuge_defense}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_refuge_defense: e.target.checked }))}
                  className="w-4 h-4 border border-gold/50 bg-black/50 rounded-sm"
                />
                <span className="font-body text-muted-foreground">
                  Se attivo, il valore di RIFUGIO del PG potrà ridurre la difficoltà della prova.
                </span>
              </div>
            </div>


                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Descrizione Situazione *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="es. Trovi un antico tomo su una scrivania. Ti avvicini per esaminarlo."
                className="input-gothic rounded-sm min-h-[80px]"
                data-testid="challenge-description"
              />
            </div>

            {/* Prove Contrapposte */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-cinzel text-gold text-xs uppercase">Prove Contrapposte</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTest}
                  className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm"
                >
                  <Plus className="w-3 h-3 mr-1" /> Aggiungi Prova
                </Button>
              </div>

              {formData.tests.map((test, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-black/30 rounded-sm border border-border/50 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-gold text-sm">PROVA {index + 1}</span>
                    {formData.tests.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTest(index)}
                        className="text-primary hover:bg-primary/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Attributo (es. Intelligenza + Occulto) *</Label>
                      <Input
                        value={test.attribute}
                        onChange={(e) => updateTest(index, "attribute", e.target.value)}
                        placeholder="Attributo1 + Attributo2"
                        className="input-gothic rounded-sm"
                        data-testid={`test-${index}-attribute`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Difficoltà *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={test.difficulty}
                        onChange={(e) => updateTest(index, "difficulty", e.target.value)}
                        className="input-gothic rounded-sm"
                        data-testid={`test-${index}-difficulty`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Testo SUCCESSO *</Label>
                    <Textarea
                      value={test.success_text}
                      onChange={(e) => updateTest(index, "success_text", e.target.value)}
                      placeholder="Testo mostrato in caso di successo..."
                      className="input-gothic rounded-sm min-h-[60px]"
                      data-testid={`test-${index}-success`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Testo PARITÀ *</Label>
                    <Textarea
                      value={test.tie_text}
                      onChange={(e) => updateTest(index, "tie_text", e.target.value)}
                      placeholder="Testo mostrato in caso di parità..."
                      className="input-gothic rounded-sm min-h-[60px]"
                      data-testid={`test-${index}-tie`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Testo FALLIMENTO *</Label>
                    <Textarea
                      value={test.failure_text}
                      onChange={(e) => updateTest(index, "failure_text", e.target.value)}
                      placeholder="Testo mostrato in caso di fallimento..."
                      className="input-gothic rounded-sm min-h-[60px]"
                      data-testid={`test-${index}-failure`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                data-testid="save-challenge-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? "AGGIORNA" : "SALVA PROVA"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
              >
                ANNULLA
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Prove */}
      <div className="card-gothic rounded-sm overflow-hidden" data-testid="challenges-list">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-cinzel text-gold uppercase tracking-widest text-sm">
            Prove Esistenti ({challenges.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChallenges}
            className="text-gold hover:bg-gold/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-cinzel text-muted-foreground">Nessuna prova creata</p>
              <p className="font-body text-muted-foreground/70 text-sm mt-2">
                Crea la tua prima prova LARP
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="p-4 hover:bg-gold/5 transition-colors">
                  <div 
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedChallenge(expandedChallenge === challenge.id ? null : challenge.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Swords className="w-4 h-4 text-gold" />
                        <h4 className="font-cinzel text-parchment">{challenge.name}</h4>
                        <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded text-gold">
                          {challenge.tests.length} {challenge.tests.length === 1 ? "prova" : "prove"}
                        </span>
                      </div>
                      <p className="font-body text-muted-foreground text-sm line-clamp-2">
                        {challenge.description}
                      </p>
                      {challenge.keywords.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {challenge.keywords.map((kw, i) => (
                            <span key={i} className="text-xs bg-black/30 px-2 py-0.5 rounded text-muted-foreground">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedChallenge === challenge.id ? (
                        <ChevronUp className="w-4 h-4 text-gold" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gold" />
                      )}
                    </div>
                  </div>

                  {/* Dettaglio espanso */}
                  {expandedChallenge === challenge.id && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                      {challenge.tests.map((test, idx) => (
                        <div key={idx} className="p-3 bg-black/20 rounded-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-cinzel text-gold text-xs">PROVA {idx + 1}</span>
                            <span className="text-xs text-muted-foreground">
                              {test.attribute} - Difficoltà {test.difficulty}
                            </span>
                          </div>
                          <div className="grid gap-2 text-xs">
                            <div><span className="text-green-500">✓ Successo:</span> <span className="text-muted-foreground">{test.success_text.substring(0, 80)}...</span></div>
                            <div><span className="text-yellow-500">= Parità:</span> <span className="text-muted-foreground">{test.tie_text.substring(0, 80)}...</span></div>
                            <div><span className="text-red-500">✗ Fallimento:</span> <span className="text-muted-foreground">{test.failure_text.substring(0, 80)}...</span></div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleEdit(challenge); }}
                          className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
                        >
                          MODIFICA
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleDelete(challenge.id); }}
                          className="border-primary/50 text-primary hover:bg-primary/10 rounded-sm font-cinzel"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> ELIMINA
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
