import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, BarChart3 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KnowledgeProgressModal({ userId, username, token, onClose }) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`${API}/admin/knowledge-progress/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          setProgress(await response.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [userId, token]);

  const quarters = [...new Set(progress.map((p) => p.quarter))].sort().reverse();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-lg w-full max-h-[80vh] flex flex-col" data-testid="knowledge-progress-modal">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
              Conteggi di {username}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white" data-testid="close-progress-modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="font-body text-muted-foreground text-xs mb-4 flex-shrink-0">
          Prove Contrapposte superate/pareggiate per tipologia di conoscenze (invisibile al giocatore).
          A 5 vittorie nel trimestre scatta il pallino e il contatore si azzera.
        </p>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {loading ? (
            <p className="text-muted-foreground text-center py-6">Caricamento...</p>
          ) : progress.length === 0 ? (
            <p className="font-body text-muted-foreground text-center py-6">
              Nessuna prova superata o pareggiata finora.
            </p>
          ) : (
            quarters.map((q) => (
              <div key={q} className="mb-4">
                <h3 className="font-cinzel text-gold text-xs uppercase tracking-widest border-b border-gold/30 pb-1 mb-2">
                  Trimestre {q}
                </h3>
                {progress.filter((p) => p.quarter === q).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20">
                    <span className="font-cinzel text-parchment text-sm">{p.knowledge}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-body text-muted-foreground text-xs">{p.wins || 0}/5 vittorie</span>
                      {(p.pallini || 0) > 0 && (
                        <span className="text-[10px] font-cinzel uppercase text-gold bg-gold/10 border border-gold/40 px-2 py-0.5 rounded-sm">
                          {p.pallini} pallin{p.pallini === 1 ? "o" : "i"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
