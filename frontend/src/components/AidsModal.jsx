import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, Lock, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AidsModal({ token, onClose, onResult, refreshUser }) {
  const [aids, setAids] = useState([]);
  const [usedAids, setUsedAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAid, setSelectedAid] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [playerValue, setPlayerValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [aidsRes, usedRes] = await Promise.all([
        fetch(`${API}/aids/active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/aids/my-used`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (aidsRes.ok) setAids(await aidsRes.json());
      if (usedRes.ok) setUsedAids(await usedRes.json());
    } catch (error) {
      toast.error("Errore nel caricamento aiuti");
    } finally {
      setLoading(false);
    }
  };

  const isLevelUsed = (aidId, level) => {
    return usedAids.some(u => u.aid_id === aidId && u.level === level);
  };

  const canUseLevel = (level, playerVal) => {
    return parseInt(playerVal) >= level;
  };

  const handleSelectAid = (aid) => {
    setSelectedAid(aid);
    setSelectedLevel(null);
    setPlayerValue("");
  };

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
  };

  const handleUseAid = async () => {
    if (!playerValue || parseInt(playerValue) < 0) {
      toast.error("Inserisci il tuo valore di attributo");
      return;
    }

    if (!canUseLevel(selectedLevel.level, playerValue)) {
      toast.error(`Il tuo valore (${playerValue}) è insufficiente per questo livello (${selectedLevel.level})`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/aids/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          aid_id: selectedAid.id,
          level: selectedLevel.level,
          player_attribute_value: parseInt(playerValue)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success("Aiuto ottenuto!");
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
            <h2 className="font-gothic text-xl text-gold">Aiuti Disponibili</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          {aids.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-cinzel text-muted-foreground">Nessun aiuto attivo oggi</p>
              <p className="font-body text-muted-foreground/70 text-sm mt-2">
                Gli aiuti sono disponibili solo durante gli eventi dal vivo
              </p>
            </div>
          ) : !selectedAid ? (
            // Lista aiuti
            <div className="p-4 space-y-3">
              <p className="font-body text-muted-foreground text-sm mb-4">
                Seleziona un aiuto da utilizzare:
              </p>
              {aids.map((aid) => (
                <button
                  key={aid.id}
                  onClick={() => handleSelectAid(aid)}
                  className="w-full p-4 bg-black/30 border border-border/50 rounded-sm hover:border-gold/50 hover:bg-gold/5 transition-all text-left"
                  data-testid={`select-aid-${aid.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span className="font-cinzel text-gold">{aid.name}</span>
                  </div>
                  <p className="font-body text-parchment text-sm">
                    Attributo: {aid.attribute}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {aid.levels.map((level) => (
                      <span 
                        key={level.level}
                        className={`text-xs px-2 py-0.5 rounded ${
                          isLevelUsed(aid.id, level.level) 
                            ? "bg-muted text-muted-foreground line-through" 
                            : "bg-secondary/50 text-gold"
                        }`}
                      >
                        {level.level_name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : !selectedLevel ? (
            // Selezione livello
            <div className="p-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAid(null)}
                className="text-gold"
              >
                ← Torna agli aiuti
              </Button>

              <div className="p-4 bg-secondary/30 rounded-sm border border-gold/30">
                <h3 className="font-cinzel text-gold mb-1">{selectedAid.name}</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Attributo: {selectedAid.attribute}
                </p>
              </div>

              <p className="font-body text-muted-foreground text-sm">
                Seleziona il livello di aiuto:
              </p>

              <div className="space-y-2">
                {selectedAid.levels.map((level) => {
                  const used = isLevelUsed(selectedAid.id, level.level);
                  return (
                    <button
                      key={level.level}
                      onClick={() => !used && handleSelectLevel(level)}
                      disabled={used}
                      className={`w-full p-4 rounded-sm border text-left transition-all ${
                        used 
                          ? "bg-muted/20 border-muted cursor-not-allowed" 
                          : "bg-black/30 border-border/50 hover:border-gold/50 hover:bg-gold/5"
                      }`}
                      data-testid={`select-level-${level.level}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {used ? (
                            <Check className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-gold" />
                          )}
                          <span className={`font-cinzel ${used ? "text-muted-foreground line-through" : "text-gold"}`}>
                            Livello {level.level} - {level.level_name}
                          </span>
                        </div>
                        {used && <span className="text-xs text-muted-foreground">Già usato</span>}
                      </div>
                      <p className={`font-body text-sm mt-1 ${used ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        Richiede {selectedAid.attribute} ≥ {level.level}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Input valore e conferma
            <div className="p-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLevel(null)}
                className="text-gold"
              >
                ← Torna ai livelli
              </Button>

              <div className="p-4 bg-secondary/30 rounded-sm border border-gold/30">
                <h3 className="font-cinzel text-gold mb-1">{selectedAid.name}</h3>
                <p className="font-body text-parchment text-sm">
                  {selectedAid.attribute} - Livello {selectedLevel.level_name}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-sm">
                  Inserisci il tuo valore di {selectedAid.attribute}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={playerValue}
                  onChange={(e) => setPlayerValue(e.target.value)}
                  placeholder="es. 5"
                  className="input-gothic rounded-sm text-center text-xl h-14"
                  autoFocus
                  data-testid="aid-player-value"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Richiesto: {selectedAid.attribute} ≥ {selectedLevel.level}
                </p>
              </div>

              {playerValue && !canUseLevel(selectedLevel.level, playerValue) && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm">
                  <div className="flex items-center gap-2 text-red-400">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">
                      Valore insufficiente per questo livello
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleUseAid}
                disabled={submitting || !playerValue || !canUseLevel(selectedLevel.level, playerValue)}
                className="w-full bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                data-testid="confirm-aid-btn"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                OTTIENI AIUTO
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
