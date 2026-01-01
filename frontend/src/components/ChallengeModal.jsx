import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Swords, Loader2, Dices, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChallengeModal({ challenge, token, onClose, onResult }) {
  const [step, setStep] = useState("choose");
  const [selectedTest, setSelectedTest] = useState(null);
  const [playerValue, setPlayerValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [useRefuge, setUseRefuge] = useState(false);
  const [followersToUse, setFollowersToUse] = useState(0);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Carica equipaggiamento quando si seleziona una prova
  useEffect(() => {
    if (step === "input" && selectedTest !== null) {
      fetchEquipment();
    }
  }, [step, selectedTest]);

  const fetchEquipment = async () => {
    setLoadingEquipment(true);
    try {
      const response = await fetch(`${API}/equipment/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filtra solo oggetti con bonus/malus
        const usableItems = (data.items || []).filter(item => 
          (item.bonus || item.malus) && (item.remaining_uses === null || item.remaining_uses > 0)
        );
        setEquipment(usableItems);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleSelectTest = (index) => {
    setSelectedTest(index);
    setStep("input");
  };

  const handleAttempt = async () => {
    if (!playerValue || parseInt(playerValue) < 0) {
      toast.error("Inserisci un valore valido");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        challenge_id: challenge.id,
        test_index: selectedTest,
        player_value: parseInt(playerValue),
        use_refuge: useRefuge,
        followers_to_use: parseInt(followersToUse) || 0,
        equipment_id: selectedEquipment || null
      };

      const response = await fetch(`${API}/challenges/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        setStep("result");
        onResult(data);
      } else {
        toast.error(data.detail || "Errore");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeStyle = (outcome) => {
    switch (outcome) {
      case "success": return "border-green-500/50 bg-green-500/10";
      case "tie": return "border-yellow-500/50 bg-yellow-500/10";
      case "failure": return "border-red-500/50 bg-red-500/10";
      default: return "";
    }
  };

  const getOutcomeLabel = (outcome) => {
    switch (outcome) {
      case "success": return "Successo!";
      case "tie": return "Parità";
      case "failure": return "Fallimento";
      default: return "";
    }
  };

  const getSelectedEquipmentItem = () => {
    return equipment.find(e => e.id === selectedEquipment);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" data-testid="challenge-modal">
      <div className="bg-card border border-gold/30 rounded-sm max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <Swords className="w-5 h-5 text-gold" />
          <h2 className="font-gothic text-xl text-gold">{challenge.name}</h2>
        </div>

        {/* Descrizione */}
        <div className="p-4 border-b border-border/30">
          <p className="font-body text-parchment leading-relaxed">
            {challenge.description}
          </p>
        </div>

        {/* Step: Scegli Prova */}
        {step === "choose" && (
          <div className="p-4 space-y-4">
            <p className="font-cinzel text-gold text-sm uppercase tracking-widest">
              Scegli una Prova
            </p>
            
            <div className="space-y-3">
              {challenge.tests.map((test, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectTest(index)}
                  className="w-full p-4 bg-black/30 border border-border/50 rounded-sm hover:border-gold/50 hover:bg-gold/5 transition-all text-left"
                  data-testid={`choose-test-${index}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-cinzel text-gold">PROVA {index + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      Difficoltà: {test.difficulty}
                    </span>
                  </div>
                  <p className="font-body text-parchment text-sm">
                    {test.attribute}
                  </p>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel mt-4"
            >
              ANNULLA
            </Button>
          </div>
        )}

        {/* Step: Input Valore */}
        {step === "input" && selectedTest !== null && (
          <div className="p-4 space-y-4">
            <div className="p-3 bg-secondary/30 rounded-sm border border-secondary/50">
              <p className="font-cinzel text-gold text-xs uppercase mb-1">Prova Selezionata</p>
              <p className="font-body text-parchment">
                {challenge.tests[selectedTest].attribute}
              </p>
              <p className="font-body text-muted-foreground text-sm mt-1">
                Difficoltà: {challenge.tests[selectedTest].difficulty}
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-cinzel text-gold text-sm uppercase tracking-widest">
                Inserisci il tuo punteggio di {challenge.tests[selectedTest].attribute}
              </label>
              <Input
                type="number"
                min="0"
                max="20"
                value={playerValue}
                onChange={(e) => setPlayerValue(e.target.value)}
                placeholder="es. 5"
                className="input-gothic rounded-sm text-center text-xl h-14"
                autoFocus
                data-testid="player-value-input"
              />
              
              {/* Mostra bonus dell'oggetto selezionato */}
              {selectedEquipment && (
                <p className="text-xs text-green-400 text-center">
                  + {getSelectedEquipmentItem()?.bonus || 0} bonus da {getSelectedEquipmentItem()?.item_name}
                </p>
              )}

              {/* Rifugio */}
              {challenge.allow_refuge_defense && (
                <div className="flex items-center gap-2 mb-2 mt-2">
                  <input
                    id="use_refuge"
                    type="checkbox"
                    checked={useRefuge}
                    onChange={(e) => setUseRefuge(e.target.checked)}
                    className="w-4 h-4 border border-gold/50 bg-black/50 rounded-sm"
                  />
                  <label htmlFor="use_refuge" className="font-body text-xs text-muted-foreground">
                    Usa RIFUGIO per ridurre difficoltà
                  </label>
                </div>
              )}

              {/* SEGUACI */}
              <div className="space-y-1">
                <label className="font-cinzel text-gold text-xs uppercase tracking-widest block">
                  Punti SEGUACI da usare
                </label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={followersToUse}
                  onChange={(e) => setFollowersToUse(e.target.value)}
                  className="input-gothic rounded-sm text-center h-9"
                  data-testid="followers-to-use-input"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Ogni punto SEGUACI abbassa la difficoltà di 1
                </p>
              </div>

              {/* Equipaggiamento */}
              {equipment.length > 0 && (
                <div className="border border-gold/30 rounded-sm p-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gold" />
                    <span className="font-cinzel text-gold text-xs uppercase">Usa un oggetto</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <button
                      onClick={() => setSelectedEquipment(null)}
                      className={`w-full p-2 text-left rounded-sm text-xs transition-all ${
                        !selectedEquipment ? "bg-gold/20 border-gold/50" : "bg-black/30 border-border/30"
                      } border`}
                    >
                      <span className="text-muted-foreground">Nessun oggetto</span>
                    </button>
                    {equipment.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedEquipment(item.id)}
                        className={`w-full p-2 text-left rounded-sm text-xs transition-all ${
                          selectedEquipment === item.id ? "bg-gold/20 border-gold/50" : "bg-black/30 border-border/30"
                        } border`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-parchment font-cinzel">{item.item_name}</span>
                          <span className="text-green-400">
                            {item.bonus ? `+${item.bonus}` : ""}
                            {item.malus ? `-${item.malus}` : ""}
                          </span>
                        </div>
                        {item.bonus_attribute && (
                          <p className="text-[10px] text-muted-foreground">{item.bonus_attribute}</p>
                        )}
                        {item.remaining_uses != null && (
                          <p className="text-[10px] text-blue-300">{item.remaining_uses} utilizzi rimasti</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingEquipment && (
                <p className="text-xs text-muted-foreground text-center">Caricamento equipaggiamento...</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep("choose"); setSelectedTest(null); setSelectedEquipment(null); }}
                className="flex-1 border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
              >
                INDIETRO
              </Button>
              <Button
                onClick={handleAttempt}
                disabled={loading || !playerValue}
                className="flex-1 bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                data-testid="roll-dice-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Dices className="w-4 h-4 mr-2" />
                )}
                LANCIA I DADI
              </Button>
            </div>
          </div>
        )}

        {/* Step: Risultato */}
        {step === "result" && result && (
          <div className="p-4 space-y-4">
            <div className="text-center py-4">
              <p className="font-body text-muted-foreground text-sm mb-3">Risultato del lancio</p>
              <div className="flex items-center justify-center gap-4 text-xl">
                <div className="text-center">
                  <p className="font-gothic text-gold text-3xl">
                    ({result.player_value}×{result.player_roll}) = {result.player_result}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Il tuo tiro</p>
                </div>
                <span className="font-gothic text-2xl text-parchment">vs</span>
                <div className="text-center">
                  <p className="font-gothic text-primary text-3xl">
                    ({result.difficulty}×{result.difficulty_roll}) = {result.difficulty_result}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Difficoltà</p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-sm border-2 ${getOutcomeStyle(result.outcome)}`}>
              <p className={`font-gothic text-2xl text-center mb-3 ${
                result.outcome === "success" ? "text-green-400" :
                result.outcome === "tie" ? "text-yellow-400" : "text-red-400"
              }`}>
                {getOutcomeLabel(result.outcome)}
              </p>
              <p className="font-body text-parchment leading-relaxed text-center">
                {result.message.split(": ").slice(1).join(": ")}
              </p>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-secondary hover:bg-secondary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
              data-testid="close-result-btn"
            >
              CHIUDI
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
