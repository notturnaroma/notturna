import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Equipment from "@/components/Equipment";
import { ArrowLeft, Package } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function EquipmentPage({ user, token, onLogout }) {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-gold hover:text-gold/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-cinzel text-sm hidden sm:inline">TORNA</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-gold" />
            <h1 className="font-gothic text-xl md:text-2xl text-gold">
              {settings.nav_equipment || "EQUIPAGGIAMENTO"}
            </h1>
          </div>

          <div className="w-24" /> {/* Spacer */}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Equipment token={token} />
        
        <div className="mt-6 p-4 bg-black/30 border border-border/40 rounded-sm">
          <h3 className="font-cinzel text-gold text-sm uppercase tracking-widest mb-2">
            Come usare gli oggetti nelle Prove
          </h3>
          <p className="font-body text-muted-foreground text-sm leading-relaxed">
            Gli oggetti con <span className="text-green-400">bonus/malus</span> possono essere usati durante le 
            <span className="text-gold"> Prove LARP</span> per modificare il tuo valore. 
            Quando affronti una prova, seleziona l'oggetto che vuoi usare dalla lista. 
            Il bonus/malus verrà applicato al tuo punteggio, e se l'oggetto ha utilizzi limitati, 
            ne consumerà uno.
          </p>
        </div>
      </main>
    </div>
  );
}
