import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, RefreshCw, Calendar, Coins, Swords, Infinity } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Equipment({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/equipment/me`, {
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
    <div className="card-gothic rounded-sm p-6" data-testid="equipment-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gold" />
          <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm">
            Equipaggiamento
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchEquipment} className="text-gold hover:bg-gold/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <p className="font-body text-muted-foreground text-xs mb-4">
        Oggetti acquisiti durante il gioco. Quelli con bonus/malus possono essere usati nelle Prove LARP.
      </p>

      <ScrollArea className="h-64">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-gold animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="font-body text-muted-foreground text-sm">
              Non hai ancora nessun oggetto.
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
                    <h3 className="font-cinzel text-parchment text-sm">
                      {item.item_name}
                    </h3>
                    {item.item_description && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {item.item_description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gold">
                    <Coins className="w-3 h-3" />
                    <span className="font-body text-xs">
                      {item.cost_resources === 0 ? "Gratis" : item.cost_resources}
                    </span>
                  </div>
                </div>

                {/* Info bonus/malus e utilizzi */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Utilizzi rimanenti */}
                  {item.uses != null && (
                    <span className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 text-[10px]">
                      ⚔️ {item.remaining_uses != null ? `${item.remaining_uses}/${item.uses}` : item.uses} utilizzi
                    </span>
                  )}
                  {item.uses == null && (item.bonus || item.malus) && (
                    <span className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 text-[10px]">
                      <Infinity className="w-3 h-3" /> illimitato
                    </span>
                  )}
                  
                  {/* Bonus/Malus */}
                  {(item.bonus || item.malus) && (
                    <span className="bg-green-500/20 px-2 py-0.5 rounded text-green-300 text-[10px]">
                      <Swords className="w-3 h-3 inline mr-1" />
                      {item.bonus ? `+${item.bonus}` : ""}
                      {item.malus ? ` -${item.malus}` : ""}
                      {item.bonus_attribute ? ` (${item.bonus_attribute})` : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.acquired_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
