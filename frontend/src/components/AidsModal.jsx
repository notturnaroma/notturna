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

  const getEventWindowKey = () => {
    const { event_window_start, event_window_end } = settings;
    if (!event_window_start || !event_window_end) return null;
    return `${event_window_start}|${event_window_end}`;
  };

  const isWithinEventWindow = () => {
    const { event_window_start, event_window_end } = settings;
    if (!event_window_start || !event_window_end) return false;
    const now = new Date();
    const start = new Date(event_window_start);
    const end = new Date(event_window_end);
    return now >= start && now <= end;
  };

  useEffect(() => {
    fetchData();

    // Se siamo dentro la macrofinestra evento, prova a recuperare valori salvati
    if (isWithinEventWindow()) {
      const key = getEventWindowKey();
      if (key) {
        try {
          const stored = localStorage.getItem(`focus_attr_values::${key}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === "object") {
              setSubmittedValues(parsed);
            }
          }
        } catch (e) {
          console.error("Errore nel recupero dei valori attributo salvati", e);
        }
      }
    }
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
  const recomputeAvailableAids = (valuesMap) => {
    const filtered = aids
      .map(aid => {
        const attr = aid.attribute;
        const playerVal = valuesMap[attr];
        if (playerVal == null) return { ...aid, availableLevels: [] };

        const availableLevels = aid.levels.filter(l =>
          playerVal >= l.level && !isLevelUsed(aid.id, l.level)
        );
        return { ...aid, availableLevels };
      })
      .filter(a => a.availableLevels.length > 0);

    setAvailableAids(filtered);

    if (Object.keys(valuesMap).length > 0 && filtered.length > 0) {
      setStep("select");
    }
  };

  useEffect(() => {
    // Se abbiamo valori salvati e gli aiuti sono stati caricati, ricalcola le focalizzazioni disponibili
    if (submittedValues && aids.length > 0) {
      recomputeAvailableAids(submittedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aids, usedAids]);

  };

  // Quando il giocatore inserisce tutti i valori, calcola le focalizzazioni disponibili
  const handleValueSubmit = () => {
    // Almeno un attributo deve avere un valore valido
    const entries = Object.entries(playerValues)
      .map(([attr, val]) => [attr, parseInt(val, 10)])
      .filter(([, val]) => !isNaN(val) && val >= 0);

    if (entries.length === 0) {
      toast.error("Inserisci almeno un valore valido per i tuoi attributi");
      return;
    }

    const valuesMap = Object.fromEntries(entries);

    // Salva i valori per la macrofinestra evento live, se definita
    if (isWithinEventWindow()) {
      const key = getEventWindowKey();
      if (key) {
        try {
          localStorage.setItem(`focus_attr_values::${key}`, JSON.stringify(valuesMap));
        } catch (e) {
          console.error("Errore nel salvataggio dei valori attributo", e);
        }
      }
    }

    // Filtra aiuti su tutti gli attributi contemporaneamente
    const filtered = aids
      .map(aid => {
        const attr = aid.attribute;
        const playerVal = valuesMap[attr];
        if (playerVal == null) return { ...aid, availableLevels: [] };

        const availableLevels = aid.levels.filter(l =>
          playerVal >= l.level && !isLevelUsed(aid.id, l.level)
        );
        return { ...aid, availableLevels };
      })
      .filter(a => a.availableLevels.length > 0);

    if (filtered.length === 0) {
      toast.error("Nessuna focalizzazione disponibile per i tuoi valori");
      return;
    }

    setSubmittedValues(valuesMap);
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
          player_attribute_value: submittedValues[aid.attribute]
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
            // Step 1: Inserisci i valori dei tuoi attributi
            <div className="p-6 space-y-6">
              <p className="font-body text-muted-foreground text-center">
                {settings.aids_subtitle || "Inserisci i valori dei tuoi attributi per vedere le focalizzazioni disponibili"}
              </p>

              <div className="grid grid-cols-1 gap-4">
                {ATTRIBUTE_OPTIONS.map(attr => (
                  <div key={attr} className="space-y-2">
                    <Label className="font-cinzel text-gold text-sm block text-center">
                      {settings.aids_input_label || "Inserisci il tuo valore di"} {attr}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={playerValues[attr]}
                      onChange={(e) => setPlayerValues(prev => ({ ...prev, [attr]: e.target.value }))}
                      placeholder="es. 5"
                      className="input-gothic rounded-sm text-center text-2xl h-14"
                      data-testid={`aid-player-value-${attr}`}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleValueSubmit}
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

              <div className="p-3 bg-secondary/30 rounded-sm border border-gold/30 text-center space-y-1">
                {ATTRIBUTE_OPTIONS.map(attr => (
                  submittedValues && submittedValues[attr] != null && (
                    <p key={attr} className="font-body text-muted-foreground text-sm">
                      Il tuo valore di <span className="text-gold font-cinzel">{attr}</span>:
                      <span className="text-gold font-gothic text-xl ml-2">{submittedValues[attr]}</span>
                    </p>
                  )
                ))}
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
