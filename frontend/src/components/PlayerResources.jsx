import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PlayerResources({ token }) {
  const [state, setState] = useState({
    total_resources: 0,
    locked_resources: 0,
    available_resources: 0,
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState(null);

  const fetchState = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/resources/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setState(await response.json());
      }
    } catch (error) {
      toast.error("Errore nel caricamento delle RISORSE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (itemId) => {
    setPurchasingId(itemId);
    try {
      const response = await fetch(`${API}/resources/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ item_id: itemId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Acquisto effettuato");
        setState(data);
      } else {
        toast.error(data.detail || "Impossibile completare l'acquisto");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="player-resources">
      <div className="flex items-center justify-between">
        <h3 className="font-cinzel text-gold text-xs uppercase tracking-widest">RISORSE &amp; Oggetti</h3>
        <span className="font-body text-xs text-muted-foreground">
          Totali: {state.total_resources} / Bloccate: {state.locked_resources} / Disponibili: {state.available_resources}
        </span>
      </div>

      <ScrollArea className="h-56 pr-2">
        {loading ? (
          <p className="font-body text-muted-foreground text-sm">Caricamento...</p>
        ) : state.items.length === 0 ? (
          <p className="font-body text-muted-foreground text-sm">
            Nessun oggetto definito dalla Narrazione.
          </p>
        ) : (
          <div className="space-y-2">
            {state.items.map(item => {
              const canBuy = state.available_resources >= item.cost_resources;
              return (
                <div key={item.id} className="p-3 bg-black/40 border border-border/40 rounded-sm flex items-start justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-parchment text-sm">{item.name}</p>
                    {item.description && (
                      <p className="font-body text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.block_until && (
                      <p className="font-body text-[11px] text-muted-foreground mt-1">
                        Blocco fino al: {new Date(item.block_until).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-body text-xs text-gold">
                      Costo: {item.cost_resources} RISORSE
                    </span>
                    <Button
                      size="xs"
                      disabled={!canBuy || purchasingId === item.id}
                      onClick={() => handlePurchase(item.id)}
                      className="mt-1 bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm font-cinzel text-xs"
                    >
                      {purchasingId === item.id ? "Acquisto..." : "Acquista"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
