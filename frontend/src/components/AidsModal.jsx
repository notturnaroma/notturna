import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, Lock, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AidsModal({ token, onClose, onResult, refreshUser }) {
  const { settings } = useSettings();
  const [aids, setAids] = useState([]);
  const [usedAids, setUsedAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Step 1: inserisci tutti i valori attributo, Step 2: selezione livello
  const [step, setStep] = useState("input");
  const [playerValues, setPlayerValues] = useState({
    Saggezza: "",
    Percezione: "",
    Intelligenza: ""
  });
  const [submittedValues, setSubmittedValues] = useState(null);
  const [availableAids, setAvailableAids] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [aidsRes, usedRes] = await Promise.all([
        fetch(`${API}/aids/active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/aids/my-used`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (aidsRes.ok) {
        const aidsData = await aidsRes.json();
        setAids(aidsData);
      }
      if (usedRes.ok) setUsedAids(await usedRes.json());
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const isLevelUsed = (aidId, level) => {
    return usedAids.some(u => u.aid_id === aidId && u.level === level);
  };

  // Quando l'utente inserisce il valore, filtra gli aiuti disponibili
  const handleValueSubmit = () => {
    if (!playerValue || parseInt(playerValue) < 0) {
      toast.error("Inserisci un valore valido");
      return;
    }
    
    const val = parseInt(playerValue);
    
    // Filtra aiuti per attributo selezionato e trova livelli disponibili
    const filtered = aids
      .filter(a => !selectedAttribute || a.attribute === selectedAttribute)
      .map(aid => {
        // Trova livelli che il giocatore può usare (valore >= livello richiesto) e non già usati
        const availableLevels = aid.levels.filter(l => 
          val >= l.level && !isLevelUsed(aid.id, l.level)
        );
        return { ...aid, availableLevels };
      })
      .filter(a => a.availableLevels.length > 0);
    
    if (filtered.length === 0) {
      toast.error("Nessuna focalizzazione disponibile per il tuo valore");
      return;
    }
    
    setAvailableAids(filtered);
    setStep("select");
  };

  const handleUseAid = async (aid, level) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/aids/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aid_id: aid.id,
          level: level.level,
          player_attribute_value: parseInt(playerValue)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success("Focalizzazione ottenuta!");
        onResult(data);
        refreshUser();
        onClose();
      } else {
        toast.error(data.detail || "Errore");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  };

  // Attributi fissi definiti dalla Narrazione
  const ATTRIBUTE_OPTIONS = ["Saggezza", "Percezione", "Intelligenza"];

  // Ottieni attributi effettivamente presenti nelle focalizzazioni attive (per evidenziare solo quelli disponibili)
  const availableAttributes = ATTRIBUTE_OPTIONS.filter(attr =>
    aids.some(a => a.attribute === attr)
  );

  const uniqueAttributes = availableAttributes.length > 0 ? availableAttributes : ATTRIBUTE_OPTIONS;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-gold/30 rounded-sm p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" data-testid="aids-modal">
      <div className="bg-card border border-gold/30 rounded-sm max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-gold" />
            <h2 className="font-gothic text-xl text-gold">{settings.aids_title || "Focalizzazioni degli Attributi"}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          {aids.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-cinzel text-muted-foreground">{settings.aids_no_active || "Nessuna focalizzazione attiva"}</p>
              <p className="font-body text-muted-foreground/70 text-sm mt-2">
                {settings.aids_no_active_desc || "Le focalizzazioni sono disponibili solo durante gli eventi dal vivo"}
              </p>
            </div>
          ) : step === "input" ? (
            // Step 1: Inserisci valore attributo
            <div className="p-6 space-y-6">
              <p className="font-body text-muted-foreground text-center">
                {settings.aids_subtitle || "Inserisci il valore del tuo attributo per vedere le focalizzazioni disponibili"}
              </p>

              {/* Selezione attributo se ce ne sono più di uno */}
              {uniqueAttributes.length > 1 && (
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-sm">Seleziona Attributo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {uniqueAttributes.map(attr => (
                      <button
                        key={attr}
                        onClick={() => setSelectedAttribute(attr)}
                        className={`p-3 rounded-sm border text-sm font-cinzel transition-all ${
                          selectedAttribute === attr
                            ? "border-gold bg-gold/20 text-gold"
                            : "border-border/50 bg-black/30 text-parchment hover:border-gold/50"
                        }`}
                      >
                        {attr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="font-cinzel text-gold text-sm text-center block">
                  {settings.aids_input_label || "Inserisci il tuo valore di"} {selectedAttribute || "attributo"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={playerValue}
                  onChange={(e) => setPlayerValue(e.target.value)}
                  placeholder="es. 5"
                  className="input-gothic rounded-sm text-center text-2xl h-16"
                  autoFocus
                  data-testid="aid-player-value"
                />
              </div>

              <Button
                onClick={handleValueSubmit}
                disabled={!playerValue || (uniqueAttributes.length > 1 && !selectedAttribute)}
                className="w-full bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel h-12"
                data-testid="aid-submit-value"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                CERCA FOCALIZZAZIONI
              </Button>
            </div>
          ) : (
            // Step 2: Mostra focalizzazioni disponibili
            <div className="p-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStep("input"); setAvailableAids([]); }}
                className="text-gold"
              >
                ← Modifica valore
              </Button>

              <div className="p-3 bg-secondary/30 rounded-sm border border-gold/30 text-center">
                <p className="font-body text-muted-foreground text-sm">
                  Il tuo valore di <span className="text-gold font-cinzel">{selectedAttribute || aids[0]?.attribute}</span>: 
                  <span className="text-gold font-gothic text-xl ml-2">{playerValue}</span>
                </p>
              </div>

              <p className="font-cinzel text-gold text-sm text-center">
                Focalizzazioni disponibili:
              </p>

              <div className="space-y-3">
                {availableAids.map(aid => (
                  <div key={aid.id} className="space-y-2">
                    <p className="font-cinzel text-parchment text-sm">{aid.name}</p>
                    {aid.availableLevels.map(level => (
                      <button
                        key={level.level}
                        onClick={() => handleUseAid(aid, level)}
                        disabled={submitting}
                        className="w-full p-4 bg-black/30 border border-border/50 rounded-sm hover:border-gold/50 hover:bg-gold/5 transition-all text-left"
                        data-testid={`use-aid-${aid.id}-${level.level}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-gold" />
                            <span className="font-cinzel text-gold">
                              Livello {level.level} - {level.level_name}
                            </span>
                          </div>
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Richiede ≥ {level.level}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
