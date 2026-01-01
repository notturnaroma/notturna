import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, X, Coins, Calendar } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ViewEquipmentModal({ userId, username, token, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipment();
  }, [userId]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/equipment/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      toast.error("Errore nel caricamento dell'equipaggiamento");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
              Equipaggiamento di {username}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-2">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Caricamento...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-body text-muted-foreground text-sm">
                Nessun oggetto nell'equipaggiamento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-black/40 border border-border/40 rounded-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-cinzel text-parchment text-sm">{item.item_name}</h3>
                      {item.item_description && (
                        <p className="font-body text-muted-foreground text-xs mt-1">{item.item_description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gold">
                      <Coins className="w-3 h-3" />
                      <span className="font-body text-xs">
                        {item.cost_resources === 0 ? "Gratis" : item.cost_resources}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.acquired_at)}
                    </span>
                    {item.unlock_at && (
                      <span>Sblocco: {formatDate(item.unlock_at)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-border/30 text-center">
          <p className="font-body text-xs text-muted-foreground">
            Totale: {items.length} oggett{items.length === 1 ? "o" : "i"}
          </p>
        </div>
      </div>
    </div>
  );
}
