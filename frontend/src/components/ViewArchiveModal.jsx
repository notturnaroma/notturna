import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Archive, X, MessageSquare, User } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ViewArchiveModal({ userId, username, token, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/chat-history/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data || []);
      } else {
        toast.error("Errore nel caricamento dell'archivio");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
              Archivio di {username}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Caricamento...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-body text-muted-foreground text-sm">
                Nessuna consultazione nell'archivio.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-4 bg-black/40 border border-border/40 rounded-sm"
                >
                  <div className="text-[10px] text-muted-foreground mb-2">
                    {formatDate(item.created_at)}
                  </div>
                  
                  {/* Domanda */}
                  <div className="flex items-start gap-2 mb-3">
                    <User className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-cinzel text-gold text-xs uppercase mb-1">Domanda</p>
                      <p className="font-body text-parchment text-sm">{item.question}</p>
                    </div>
                  </div>
                  
                  {/* Risposta */}
                  <div className="flex items-start gap-2 pl-6 border-l border-gold/30">
                    <div>
                      <p className="font-cinzel text-primary text-xs uppercase mb-1">Risposta</p>
                      <p className="font-body text-muted-foreground text-sm whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/30 text-center flex-shrink-0">
          <p className="font-body text-xs text-muted-foreground">
            Totale: {history.length} consultazion{history.length === 1 ? "e" : "i"}
          </p>
        </div>
      </div>
    </div>
  );
}
