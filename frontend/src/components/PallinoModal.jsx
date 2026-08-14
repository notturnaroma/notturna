import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PallinoModal({ notification, token, onAck }) {
  const [acking, setAcking] = useState(false);

  const handleAck = async () => {
    setAcking(true);
    try {
      const response = await fetch(`${API}/notifications/${notification.id}/ack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        onAck(notification.id);
      } else {
        toast.error("Errore, riprova");
      }
    } catch (e) {
      toast.error("Errore di connessione");
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
      <div className="card-gothic rounded-sm p-8 max-w-md w-full text-center border border-gold/50" data-testid="pallino-modal">
        <Sparkles className="w-10 h-10 text-gold mx-auto mb-4" />
        <h2 className="font-gothic text-2xl text-gold mb-3">Il Sangue Ricorda</h2>
        <p className="font-body text-parchment mb-2">
          Le tue imprese non sono passate inosservate. Hai dimostrato una padronanza crescente nelle prove affrontate.
        </p>
        <p className="font-cinzel text-gold uppercase tracking-widest text-sm my-4 p-3 bg-gold/10 border border-gold/40 rounded-sm" data-testid="pallino-knowledge">
          Aggiungi un pallino a<br />
          <span className="text-lg">{notification.knowledge}</span>
        </p>
        <p className="font-body text-muted-foreground text-xs mb-6">
          Inserisci il pallino aggiuntivo sulla tua scheda ufficiale. Al prossimo accesso la scheda verrà sincronizzata.
        </p>
        <Button
          onClick={handleAck}
          disabled={acking}
          className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm font-cinzel w-full"
          data-testid="pallino-ack-btn"
        >
          {acking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          HO CAPITO
        </Button>
      </div>
    </div>
  );
}
