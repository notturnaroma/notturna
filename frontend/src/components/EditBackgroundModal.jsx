import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, Save, Trash2, Plus } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EditBackgroundModal({ userId, username, token, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [background, setBackground] = useState({
    risorse: 0,
    seguaci: 0,
    rifugio: 1,
    mentor: 0,
    notoriety: 0,
    contacts: []
  });

  useEffect(() => {
    fetchBackground();
  }, [userId]);

  const fetchBackground = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/background/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBackground({
          risorse: data.risorse ?? 0,
          seguaci: data.seguaci ?? 0,
          rifugio: data.rifugio ?? 1,
          mentor: data.mentor ?? 0,
          notoriety: data.notoriety ?? 0,
          contacts: data.contacts ?? []
        });
      }
    } catch (error) {
      toast.error("Errore nel caricamento del background");
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
      contacts: [...prev.contacts, { name: "", value: 1 }]
    }));
  };

  const handleRemoveContact = (index) => {
    setBackground(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        risorse: parseInt(background.risorse) || 0,
        seguaci: parseInt(background.seguaci) || 0,
        rifugio: parseInt(background.rifugio) || 1,
        mentor: parseInt(background.mentor) || 0,
        notoriety: parseInt(background.notoriety) || 0,
        contacts: background.contacts
          .filter(c => c.name.trim())
          .map(c => ({ name: c.name.trim(), value: parseInt(c.value) || 1 })),
        locked_for_player: true
      };

      const response = await fetch(`${API}/admin/background/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success("Background aggiornato");
        onSaved && onSaved();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Errore nel salvataggio");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  };

  const totalContacts = background.contacts.reduce((sum, c) => sum + (parseInt(c.value) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
            Modifica Background di {username}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Caricamento...</p>
        ) : (
          <div className="space-y-4">
            <p className="font-body text-xs text-muted-foreground mb-4">
              Come Narrazione puoi modificare questi valori senza limiti.
            </p>

            {/* Valori principali */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">RISORSE</Label>
                <Input
                  type="number"
                  min="0"
                  value={background.risorse}
                  onChange={(e) => handleChange("risorse", parseInt(e.target.value) || 0)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">SEGUACI</Label>
                <Input
                  type="number"
                  min="0"
                  value={background.seguaci}
                  onChange={(e) => handleChange("seguaci", parseInt(e.target.value) || 0)}
                  className="input-gothic rounded-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">RIFUGIO</Label>
                <Input
                  type="number"
                  min="0"
                  value={background.rifugio}
                  onChange={(e) => handleChange("rifugio", parseInt(e.target.value) || 1)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">MENTORE</Label>
                <Input
                  type="number"
                  min="0"
                  value={background.mentor}
                  onChange={(e) => handleChange("mentor", parseInt(e.target.value) || 0)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">NOTORIETÀ</Label>
                <Input
                  type="number"
                  min="0"
                  value={background.notoriety}
                  onChange={(e) => handleChange("notoriety", parseInt(e.target.value) || 0)}
                  className="input-gothic rounded-sm"
                />
              </div>
            </div>

            {/* Contatti */}
            <div className="space-y-3 border border-border/30 rounded-sm p-4">
              <div className="flex items-center justify-between">
                <Label className="font-cinzel text-gold text-xs uppercase">CONTATTI</Label>
                <span className="font-body text-xs text-muted-foreground">Totale: {totalContacts}</span>
              </div>

              {background.contacts.length === 0 && (
                <p className="font-body text-muted-foreground text-xs">Nessun contatto.</p>
              )}

              <div className="space-y-2">
                {background.contacts.map((c, index) => (
                  <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <Input
                      value={c.name}
                      onChange={(e) => handleContactChange(index, "name", e.target.value)}
                      placeholder="Nome contatto"
                      className="input-gothic rounded-sm text-sm"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={c.value}
                      onChange={(e) => handleContactChange(index, "value", parseInt(e.target.value) || 1)}
                      className="w-16 input-gothic rounded-sm text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveContact(index)}
                      className="text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddContact}
                className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
              >
                <Plus className="w-3 h-3 mr-1" /> Aggiungi contatto
              </Button>
            </div>

            {/* Azioni */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-border text-muted-foreground hover:bg-secondary/50 rounded-sm font-cinzel"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
