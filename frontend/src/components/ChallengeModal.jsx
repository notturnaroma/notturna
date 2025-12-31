import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Swords, Loader2, Dices } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChallengeModal({ challenge, token, onClose, onResult }) {
  const [step, setStep] = useState("choose"); // choose, input, result
  const [selectedTest, setSelectedTest] = useState(null);
  const [playerValue, setPlayerValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [useRefuge, setUseRefuge] = useState(false);


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
      const response = await fetch(`${API}/challenges/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          challenge_id: challenge.id,
          test_index: selectedTest,
          player_value: parseInt(playerValue),
          use_refuge: useRefuge
        })
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
              Scegli una Prova (max 2 tentativi per sessione)
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
              <p className="text-xs text-muted-foreground text-center">
                Somma dei tuoi due attributi
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep("choose"); setSelectedTest(null); }}
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
            {/* Calcolo */}
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

            {/* Esito */}
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
