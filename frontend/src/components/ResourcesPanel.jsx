import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, RefreshCw, Pencil, Trash2, X, Check, Eye, EyeOff, Swords } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResourcesPanel({ token }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(0);
  const [blockUntil, setBlockUntil] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [maxPerPlayer, setMaxPerPlayer] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [locationKeywords, setLocationKeywords] = useState("");
  const [uses, setUses] = useState("");
  const [bonus, setBonus] = useState("");
  const [malus, setMalus] = useState("");
  const [bonusAttribute, setBonusAttribute] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setItems(await response.json());
      }
    } catch (error) {
      toast.error("Errore nel caricamento delle RISORSE");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Inserisci un nome");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        cost_resources: parseInt(cost) || 0,
        block_until: blockUntil || null,
        total_quantity: totalQuantity ? parseInt(totalQuantity) : null,
        max_per_player: maxPerPlayer ? parseInt(maxPerPlayer) : null,
        is_public: isPublic,
        location_keywords: locationKeywords.trim() || null,
        uses: uses ? parseInt(uses) : null,
        bonus: bonus ? parseInt(bonus) : null,
        malus: malus ? parseInt(malus) : null,
        bonus_attribute: bonusAttribute.trim() || null
      };
      const response = await fetch(`${API}/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Oggetto creato");
        setName(""); setDescription(""); setCost(0); setBlockUntil("");
        setTotalQuantity(""); setMaxPerPlayer(""); setIsPublic(true);
        setLocationKeywords(""); setUses(""); setBonus(""); setMalus(""); setBonusAttribute("");
        setItems(prev => [...prev, data]);
      } else {
        toast.error(data.detail || "Errore nella creazione oggetto");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      cost_resources: item.cost_resources,
      block_until: item.block_until || "",
      total_quantity: item.total_quantity ?? "",
      max_per_player: item.max_per_player ?? "",
      is_public: item.is_public !== false,
      location_keywords: item.location_keywords || "",
      uses: item.uses ?? "",
      bonus: item.bonus ?? "",
      malus: item.malus ?? "",
      bonus_attribute: item.bonus_attribute || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (itemId) => {
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description || null,
        cost_resources: parseInt(editForm.cost_resources) || 0,
        block_until: editForm.block_until || null,
        total_quantity: editForm.total_quantity ? parseInt(editForm.total_quantity) : null,
        max_per_player: editForm.max_per_player ? parseInt(editForm.max_per_player) : null,
        is_public: editForm.is_public,
        location_keywords: editForm.location_keywords || null,
        uses: editForm.uses ? parseInt(editForm.uses) : null,
        bonus: editForm.bonus ? parseInt(editForm.bonus) : null,
        malus: editForm.malus ? parseInt(editForm.malus) : null,
        bonus_attribute: editForm.bonus_attribute || null
      };
      const response = await fetch(`${API}/resources/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const updated = await response.json();
        setItems(prev => prev.map(item => item.id === itemId ? updated : item));
        toast.success("Oggetto aggiornato");
        cancelEdit();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Errore nell'aggiornamento");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm("Sei sicuro di voler eliminare questo oggetto?")) return;
    try {
      const response = await fetch(`${API}/resources/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
        toast.success("Oggetto eliminato");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Errore nell'eliminazione");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  return (
    <div className="card-gothic rounded-sm p-6 space-y-6" data-testid="resources-panel">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm">Oggetti / Servizi (RISORSE)</h2>
        <Button variant="ghost" size="sm" onClick={fetchItems} className="text-gold hover:bg-gold/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Form creazione */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Pistola, Servizio legale..." className="input-gothic rounded-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Costo in RISORSE</Label>
            <Input type="number" min="0" value={cost} onChange={(e) => setCost(parseInt(e.target.value) || 0)} className="input-gothic rounded-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-cinzel text-gold text-xs uppercase">Descrizione</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrizione" className="input-gothic rounded-sm" />
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Blocco fino al</Label>
            <Input type="datetime-local" value={blockUntil || ""} onChange={(e) => setBlockUntil(e.target.value)} className="input-gothic rounded-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Qty Totale</Label>
            <Input type="number" min="1" value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} placeholder="∞" className="input-gothic rounded-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Max/PG</Label>
            <Input type="number" min="1" value={maxPerPlayer} onChange={(e) => setMaxPerPlayer(e.target.value)} placeholder="∞" className="input-gothic rounded-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">N° Utilizzi</Label>
            <Input type="number" min="1" value={uses} onChange={(e) => setUses(e.target.value)} placeholder="∞" className="input-gothic rounded-sm" />
          </div>
        </div>

        {/* Sezione Bonus/Malus per Prove */}
        <div className="border border-gold/30 rounded-sm p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4 text-gold" />
            <span className="font-cinzel text-gold text-xs uppercase">Bonus/Malus per Prove LARP</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Bonus (+)</Label>
              <Input type="number" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" className="input-gothic rounded-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Malus (-)</Label>
              <Input type="number" min="0" value={malus} onChange={(e) => setMalus(e.target.value)} placeholder="0" className="input-gothic rounded-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Attributo</Label>
              <Input value={bonusAttribute} onChange={(e) => setBonusAttribute(e.target.value)} placeholder="es. DESTREZZA + ARMI DA FUOCO" className="input-gothic rounded-sm text-xs" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Se specificati, il PG può usare l'oggetto nelle Prove per modificare il proprio valore. L'oggetto consuma un utilizzo.
          </p>
        </div>

        {/* Visibilità */}
        <div className="border border-border/30 rounded-sm p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="is_public" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked)} />
            <label htmlFor="is_public" className="font-body text-sm text-parchment cursor-pointer">
              Visibile nel catalogo pubblico
            </label>
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Keywords luogo</Label>
            <Input value={locationKeywords} onChange={(e) => setLocationKeywords(e.target.value)} placeholder="es. magazzino, portuense" className="input-gothic rounded-sm" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel">
            <Plus className="w-4 h-4 mr-2" /> CREA OGGETTO
          </Button>
        </div>
      </form>

      {/* Lista oggetti */}
      <div className="border-t border-border/40 pt-4">
        <h3 className="font-cinzel text-gold text-xs uppercase tracking-widest mb-2">Catalogo ({items.length})</h3>
        <ScrollArea className="h-72 pr-2">
          {loading ? (
            <p className="font-body text-muted-foreground text-sm">Caricamento...</p>
          ) : items.length === 0 ? (
            <p className="font-body text-muted-foreground text-sm">Nessun oggetto.</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="p-3 bg-black/40 border border-border/40 rounded-sm">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="input-gothic rounded-sm text-sm" />
                        <Input type="number" min="0" value={editForm.cost_resources} onChange={(e) => setEditForm({...editForm, cost_resources: e.target.value})} className="input-gothic rounded-sm text-sm" />
                      </div>
                      <Input value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="Descrizione" className="input-gothic rounded-sm text-sm" />
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" value={editForm.uses} onChange={(e) => setEditForm({...editForm, uses: e.target.value})} placeholder="Utilizzi" className="input-gothic rounded-sm text-xs" />
                        <Input type="number" value={editForm.bonus} onChange={(e) => setEditForm({...editForm, bonus: e.target.value})} placeholder="Bonus" className="input-gothic rounded-sm text-xs" />
                        <Input type="number" value={editForm.malus} onChange={(e) => setEditForm({...editForm, malus: e.target.value})} placeholder="Malus" className="input-gothic rounded-sm text-xs" />
                        <Input value={editForm.bonus_attribute} onChange={(e) => setEditForm({...editForm, bonus_attribute: e.target.value})} placeholder="Attributo" className="input-gothic rounded-sm text-xs" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Checkbox checked={editForm.is_public} onCheckedChange={(checked) => setEditForm({...editForm, is_public: checked})} />
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-muted-foreground"><X className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => saveEdit(item.id)} className="text-green-500"><Check className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {item.is_public === false ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-gold" />}
                          <span className="font-cinzel text-parchment text-sm">{item.name}</span>
                          <span className="font-body text-xs text-gold">({item.cost_resources === 0 ? "Gratis" : `${item.cost_resources} RIS`})</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="text-gold p-1 h-auto"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)} className="text-red-500 p-1 h-auto"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      {item.description && <p className="font-body text-muted-foreground text-xs mb-1">{item.description}</p>}
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {item.uses != null && <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">⚔️ {item.uses} utilizzi</span>}
                        {(item.bonus || item.malus) && (
                          <span className="bg-green-500/20 px-1.5 py-0.5 rounded text-green-300">
                            {item.bonus ? `+${item.bonus}` : ""}{item.malus ? ` -${item.malus}` : ""} {item.bonus_attribute || ""}
                          </span>
                        )}
                        {item.location_keywords && <span className="bg-gold/10 px-1.5 py-0.5 rounded text-gold">📍 {item.location_keywords}</span>}
                        {item.total_quantity != null && <span>Stock: {item.remaining_quantity}/{item.total_quantity}</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
