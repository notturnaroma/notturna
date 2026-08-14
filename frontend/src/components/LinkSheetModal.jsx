import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, Link2, Unlink, Loader2, ScrollText } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LinkSheetModal({ userId, username, currentSheetId, currentSheetName, token, onClose, onSaved }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(currentSheetId || "");

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch(`${API}/admin/sheets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          setSheets(await response.json());
        } else {
          const data = await response.json();
          toast.error("Errore", { description: data.detail });
        }
      } catch (error) {
        toast.error("Database schede non raggiungibile");
      } finally {
        setLoading(false);
      }
    };
    fetchSheets();
  }, [token]);

  const save = async (sheetId) => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/admin/users/${userId}/sheet`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sheet_id: sheetId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        onSaved?.();
        onClose();
      } else {
        toast.error("Errore", { description: data.detail });
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ScrollText className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
              Scheda di {username}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white" data-testid="close-sheet-modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="font-body text-muted-foreground text-sm mb-4">
          Collega il personaggio ufficiale dal database NOTTURNA. Il Background verrà
          sincronizzato automaticamente a ogni consultazione.
        </p>

        {currentSheetName && (
          <div className="mb-4 p-3 bg-gold/10 border border-gold/40 rounded-sm">
            <p className="font-cinzel text-gold text-sm" data-testid="current-sheet-name">
              Attualmente collegato: {currentSheetName} (ID {currentSheetId})
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-center py-6">Caricamento personaggi...</p>
        ) : (
          <div className="space-y-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="input-gothic rounded-sm" data-testid="sheet-select">
                <SelectValue placeholder="Seleziona il personaggio" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-72">
                {sheets.map((s) => (
                  <SelectItem key={s.idutente} value={s.idutente}>
                    {s.nomepg} — {s.nomeplayer} ({s.Descrizione})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-3">
              <Button
                onClick={() => save(selectedId)}
                disabled={saving || !selectedId}
                className="flex-1 bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm font-cinzel"
                data-testid="link-sheet-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                COLLEGA E SINCRONIZZA
              </Button>
              {currentSheetId && (
                <Button
                  variant="outline"
                  onClick={() => save(null)}
                  disabled={saving}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-sm font-cinzel"
                  data-testid="unlink-sheet-btn"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  SCOLLEGA
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
