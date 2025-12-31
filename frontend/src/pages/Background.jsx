import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PlayerResources from "@/components/PlayerResources";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Scroll as ScrollIcon, Loader2, Trash2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyContact = { name: "", value: 1 };

export default function Background({ user, token, onLogout }) {
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isLocked = background?.locked_for_player;

  useEffect(() => {
    fetchBackground();
  }, []);

  const fetchBackground = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/background/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Garantiamo almeno un contatto vuoto per facilità d'uso
        setBackground({
          ...data,
          contacts: data.contacts && data.contacts.length > 0 ? data.contacts : []
        });
      } else {
        toast.error("Errore nel caricamento del background");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setBackground(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    setBackground(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleAddContact = () => {
    setBackground(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), { ...emptyContact }]
    }));
  };

  const handleRemoveContact = (index) => {
    setBackground(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index)
    }));
  };

  const totalContacts = (background?.contacts || []).reduce((sum, c) => sum + (parseInt(c.value) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!background) return;

    // Validazione base lato client per miglior UX (il backend comunque valida)
    if (background.rifugio < 1 || background.rifugio > 5) {
      toast.error("RIFUGIO deve essere tra 1 e 5");
      return;
    }
    if (background.risorse < 0 || background.risorse > 20) {
      toast.error("RISORSE deve essere tra 0 e 20");
      return;
    }
    if (totalContacts > 20) {
      toast.error("La somma dei punti CONTATTI non può superare 20");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: background.user_id,
        risorse: parseInt(background.risorse) || 0,
        seguaci: parseInt(background.seguaci) || 0,
        rifugio: parseInt(background.rifugio) || 1,
        mentor: parseInt(background.mentor) || 0,
        notoriety: parseInt(background.notoriety) || 0,
        contacts: (background.contacts || [])
          .filter(c => c.name.trim())
          .map(c => ({ name: c.name.trim(), value: parseInt(c.value) || 1 })),
        locked_for_player: true
      };

      const response = await fetch(`${API}/background/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Background salvato");
        setBackground(data);
      } else {
        toast.error(data.detail || "Errore nel salvataggio del background");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !background) {
    return (
      <div className="min-h-screen bg-void stone-texture flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void stone-texture flex flex-col">
      {/* Nav */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-cinzel">INDIETRO</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <ScrollIcon className="w-6 h-6 text-gold" />
              <h1 className="font-gothic text-xl md:text-2xl text-gold">
                Background di {user?.username}
              </h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-cinzel"
          >
            Esci
          </Button>
        </div>
      </nav>

      {/* Contenuto */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <div className="card-gothic rounded-sm p-6">
          <div className="mb-6">
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest mb-1">
              Background
            </h2>
            {isLocked ? (
              <p className="font-body text-muted-foreground text-sm">
                Il tuo Background è stato salvato. Eventuali modifiche possono essere effettuate solo dalla Narrazione.
              </p>
            ) : (
              <p className="font-body text-muted-foreground text-sm">
                Compila questi valori una sola volta. Dopo il salvataggio, solo la Narrazione potrà modificarli.
              </p>
            )}
          </div>

          <ScrollArea className="max-h-[70vh] pr-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Valori principali */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">RISORSE (0–20)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={background.risorse ?? 0}
                    onChange={(e) => handleChange("risorse", parseInt(e.target.value) || 0)}
                    className="input-gothic rounded-sm"
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">SEGUACI (0–5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={background.seguaci ?? 0}
                    onChange={(e) => handleChange("seguaci", parseInt(e.target.value) || 0)}
                    className="input-gothic rounded-sm"
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">RIFUGIO (1–5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={background.rifugio ?? 1}
                    onChange={(e) => handleChange("rifugio", parseInt(e.target.value) || 1)}
                    className="input-gothic rounded-sm"
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">MENTORE (0–5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={background.mentor ?? 0}
                    onChange={(e) => handleChange("mentor", parseInt(e.target.value) || 0)}
                    className="input-gothic rounded-sm"
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">NOTORIETÀ (0–5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={background.notoriety ?? 0}
                    onChange={(e) => handleChange("notoriety", parseInt(e.target.value) || 0)}
                    className="input-gothic rounded-sm"
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Contatti */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-cinzel text-gold text-xs uppercase">CONTATTI (somma ≤ 20)</Label>
                  <span className="font-body text-xs text-muted-foreground">
                    Totale: {totalContacts}/20
                  </span>
                </div>

                {(background.contacts || []).length === 0 && (
                  <p className="font-body text-muted-foreground text-sm">
                    Nessun contatto inserito.
                  </p>
                )}

                <div className="space-y-2">
                  {(background.contacts || []).map((c, index) => (
                    <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <Input
                        value={c.name}
                        onChange={(e) => handleContactChange(index, "name", e.target.value)}
                        placeholder="es. polizia, criminalità..."
                        className="input-gothic rounded-sm"
                        disabled={isLocked}
                      />
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={c.value}
                        onChange={(e) => handleContactChange(index, "value", parseInt(e.target.value) || 1)}
                        className="w-20 input-gothic rounded-sm text-center"
                        disabled={isLocked}
                      />
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveContact(index)}
                          className="text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!isLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddContact}
                    className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel mt-1"
                  >
                    Aggiungi contatto
                  </Button>
                )}
              </div>

              {!isLocked && (
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                    data-testid="save-background-btn"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salva Background
                  </Button>
                </div>
              )}
            </form>
          {/* Sezione RISORSE / Acquisti */}
          <div className="mt-8 card-gothic rounded-sm p-4">
            <PlayerResources token={token} />
          </div>

          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
