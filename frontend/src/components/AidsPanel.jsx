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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Calendar
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const defaultLevels = [
  { level: 2, level_name: "minore", text: "" },
  { level: 4, level_name: "medio", text: "" },
  { level: 5, level_name: "maggiore", text: "" }
];

export default function AidsPanel({ token }) {
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedAid, setExpandedAid] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    attribute: "",
    event_date: "",
    levels: [...defaultLevels]
  });

  useEffect(() => {
    fetchAids();
  }, []);

  const fetchAids = async () => {
    try {
      const response = await fetch(`${API}/aids`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setAids(await response.json());
      }
    } catch (error) {
      toast.error("Errore nel caricamento aiuti");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      attribute: "",
      event_date: "",
      levels: [...defaultLevels.map(l => ({ ...l }))]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (aid) => {
    setFormData({
      name: aid.name,
      attribute: aid.attribute,
      event_date: aid.event_date,
      levels: aid.levels.map(l => ({ ...l }))
    });
    setEditingId(aid.id);
    setShowForm(true);
  };

  const updateLevel = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map((l, i) => 
        i === index ? { ...l, [field]: field === "level" ? parseInt(value) : value } : l
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione
    if (!formData.name.trim() || !formData.attribute.trim() || !formData.event_date) {
      toast.error("Compila nome, attributo e data evento");
      return;
    }
    
    for (let i = 0; i < formData.levels.length; i++) {
      if (!formData.levels[i].text.trim()) {
        toast.error(`Compila il testo per il livello ${formData.levels[i].level_name}`);
        return;
      }
    }

    setSubmitting(true);
    
    const payload = {
      name: formData.name,
      attribute: formData.attribute,
      event_date: formData.event_date,
      levels: formData.levels
    };

    try {
      const url = editingId 
        ? `${API}/aids/${editingId}`
        : `${API}/aids`;
      
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingId ? "Aiuto aggiornato!" : "Aiuto creato!");
        resetForm();
        fetchAids();
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
    if (!window.confirm("Sei sicuro di voler eliminare questo aiuto?")) return;

    try {
      const response = await fetch(`${API}/aids/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Aiuto eliminato");
        fetchAids();
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const isAidActive = (eventDate) => {
    try {
      const event = new Date(eventDate);
      const now = new Date();
      const start = new Date(event);
      start.setHours(0, 0, 0, 0);
      const end = new Date(event);
      end.setDate(end.getDate() + 1);
      end.setHours(3, 0, 0, 0);
      return now >= start && now <= end;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold" />
          <h2 className="font-cinzel text-xl text-gold uppercase tracking-widest">
            Aiuti Attributo
          </h2>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
          data-testid="new-aid-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          NUOVO AIUTO
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gothic rounded-sm p-6 border-2 border-gold/30" data-testid="aid-form">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-cinzel text-gold uppercase tracking-widest text-sm">
              {editingId ? "Modifica Aiuto" : "Nuovo Aiuto"}
            </h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info base */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Collegamento"
                  className="input-gothic rounded-sm"
                  data-testid="aid-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Attributo *</Label>
                <Input
                  value={formData.attribute}
                  onChange={(e) => setFormData(prev => ({ ...prev, attribute: e.target.value }))}
                  placeholder="es. Intelligenza"
                  className="input-gothic rounded-sm"
                  data-testid="aid-attribute"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Data Evento *</Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="input-gothic rounded-sm"
                  data-testid="aid-date"
                />
              </div>
            </div>

            {/* Livelli */}
            <div className="space-y-4">
              <Label className="font-cinzel text-gold text-xs uppercase">Livelli Aiuto</Label>
              
              {formData.levels.map((level, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-black/30 rounded-sm border border-border/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-cinzel text-gold text-sm">
                        Livello {level.level} - {level.level_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Valore richiesto:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={level.level}
                        onChange={(e) => updateLevel(index, "level", e.target.value)}
                        className="w-16 input-gothic rounded-sm text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Testo aiuto {level.level_name} *
                    </Label>
                    <Textarea
                      value={level.text}
                      onChange={(e) => updateLevel(index, "text", e.target.value)}
                      placeholder={`Testo mostrato per l'aiuto ${level.level_name}...`}
                      className="input-gothic rounded-sm min-h-[80px]"
                      data-testid={`aid-level-${index}-text`}
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
                data-testid="save-aid-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? "AGGIORNA" : "SALVA AIUTO"}
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

      {/* Lista Aiuti */}
      <div className="card-gothic rounded-sm overflow-hidden" data-testid="aids-list">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-cinzel text-gold uppercase tracking-widest text-sm">
            Aiuti Esistenti ({aids.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAids}
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
          ) : aids.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-cinzel text-muted-foreground">Nessun aiuto creato</p>
              <p className="font-body text-muted-foreground/70 text-sm mt-2">
                Crea il tuo primo aiuto per attributo
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {aids.map((aid) => (
                <div key={aid.id} className="p-4 hover:bg-gold/5 transition-colors">
                  <div 
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedAid(expandedAid === aid.id ? null : aid.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <h4 className="font-cinzel text-parchment">{aid.name}</h4>
                        <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded text-gold">
                          {aid.attribute}
                        </span>
                        {isAidActive(aid.event_date) && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            ATTIVO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(aid.event_date)}</span>
                        <span className="text-gold">•</span>
                        <span>{aid.levels.length} livelli</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedAid === aid.id ? (
                        <ChevronUp className="w-4 h-4 text-gold" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gold" />
                      )}
                    </div>
                  </div>

                  {/* Dettaglio espanso */}
                  {expandedAid === aid.id && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                      {aid.levels.map((level, idx) => (
                        <div key={idx} className="p-3 bg-black/20 rounded-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-cinzel text-gold text-xs">
                              LIVELLO {level.level} - {level.level_name.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {level.text.substring(0, 150)}{level.text.length > 150 ? "..." : ""}
                          </p>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleEdit(aid); }}
                          className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
                        >
                          MODIFICA
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleDelete(aid.id); }}
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
