import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Archive, X, MessageSquare, User, Pencil, Check, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ViewArchiveModal({ userId, username, token, onClose, canEdit = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

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

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.answer);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/admin/chat/${editingId}/answer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answer: editText })
      });
      if (response.ok) {
        toast.success("Risposta modificata");
        setEditingId(null);
        fetchHistory();
      } else {
        const data = await response.json();
        toast.error("Errore", { description: data.detail });
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
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
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white" data-testid="close-archive-modal">
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
                  <div className="pl-6 border-l border-gold/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-cinzel text-primary text-xs uppercase">Risposta</p>
                        {item.edited && (
                          <span className="text-[10px] font-cinzel uppercase tracking-wide text-gold bg-gold/10 border border-gold/40 px-2 py-0.5 rounded-sm" data-testid={`edited-badge-${item.id}`}>
                            ✦ Modificata dalla Narrazione{item.edited_by ? ` (${item.edited_by})` : ""}
                          </span>
                        )}
                      </div>
                      {canEdit && editingId !== item.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(item)}
                          className="text-gold hover:bg-gold/10 h-7 px-2"
                          data-testid={`edit-answer-btn-${item.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          <span className="text-xs font-cinzel">Modifica</span>
                        </Button>
                      )}
                    </div>

                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="input-gothic rounded-sm min-h-[120px] text-sm"
                          data-testid="edit-answer-textarea"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm font-cinzel text-xs"
                            data-testid="save-answer-btn"
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                            SALVA
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            className="border-border/50 text-muted-foreground rounded-sm font-cinzel text-xs"
                            data-testid="cancel-edit-btn"
                          >
                            ANNULLA
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-body text-muted-foreground text-sm whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    )}
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
