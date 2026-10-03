import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Database, Search, Upload, BarChart3 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const REGIONS = ["Lazio", "Abruzzo", "Umbria", "Lombardia"];

export default function StructuredKnowledgePanel({ token, user }) {
  const [region, setRegion] = useState(user?.region || "Lazio");
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const auth = { Authorization: `Bearer ${token}` };

  const importJson = async () => {
    if (!file) return toast.error("Seleziona un export JSON regionale");
    setBusy(true);
    try {
      const payload = JSON.parse(await file.text());
      if ((payload.region || "").toLowerCase() !== region.toLowerCase()) {
        return toast.error(`Il file dichiara la regione ${payload.region || "non specificata"}`);
      }
      const res = await fetch(`${API}/structured-kb/import`, {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
      toast.success(`Import ${data.region} completato: ${data.total} record`);
      await loadStats();
    } catch (e) { toast.error("Import non riuscito", { description: e.message }); }
    finally { setBusy(false); }
  };

  const loadStats = async () => {
    const res = await fetch(`${API}/structured-kb/stats/${encodeURIComponent(region)}`, { headers: auth });
    const data = await res.json();
    if (res.ok) setStats(data); else toast.error(data.detail || "Errore statistiche");
  };

  const runPreview = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/structured-kb/preview/${encodeURIComponent(region)}?q=${encodeURIComponent(query)}`, { headers: auth });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore preview");
      setPreview(data);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="gothic-card p-6 border border-gold/20">
        <div className="flex items-center gap-3 mb-5"><Database className="text-gold"/><div><h3 className="font-cinzel text-gold text-lg">KNOWLEDGE BASE STRUTTURATA</h3><p className="text-xs text-muted-foreground">Pilot Oracle v2. Non modifica i documenti della Knowledge Base legacy.</p></div></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Regione</Label><select value={region} onChange={e=>{setRegion(e.target.value);setStats(null);setPreview(null);}} className="w-full mt-2 bg-black border border-border rounded px-3 py-2">{REGIONS.map(r=><option key={r}>{r}</option>)}</select></div>
          <div><Label>Export regionale JSON</Label><Input className="mt-2" type="file" accept="application/json,.json" onChange={e=>setFile(e.target.files?.[0]||null)}/></div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button onClick={importJson} disabled={busy||!file} className="bg-gold text-black hover:bg-gold/80"><Upload className="w-4 h-4 mr-2"/>IMPORTA / AGGIORNA</Button>
          <Button variant="outline" onClick={loadStats}><BarChart3 className="w-4 h-4 mr-2"/>STATISTICHE</Button>
        </div>
        {stats && <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{Object.entries(stats.counts||{}).map(([k,v])=><div key={k} className="bg-black/40 border border-border/50 p-3"><div className="text-xs text-muted-foreground uppercase">{k}</div><div className="text-xl text-gold">{v}</div></div>)}</div>}
      </div>

      <div className="gothic-card p-6 border border-gold/20">
        <h3 className="font-cinzel text-gold text-lg mb-2">TEST RETRIEVAL</h3>
        <p className="text-sm text-muted-foreground mb-4">Scrivi una richiesta come farebbe un PG. Il test mostra soltanto quali record verrebbero consegnati all'Oracolo: non chiama l'AI e non consuma azioni.</p>
        <Textarea rows={4} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Es.: Mi reco in un luogo e cerco informazioni su..."/>
        <Button className="mt-3" variant="outline" onClick={runPreview} disabled={busy||!query.trim()}><Search className="w-4 h-4 mr-2"/>VERIFICA COSA LEGGE L'ORACOLO</Button>
        {preview && <div className="mt-5 space-y-3"><div className="text-sm text-gold">Record selezionati</div>{(preview.matches||[]).map(m=><div key={m.id} className="text-sm border-l-2 border-gold/40 pl-3"><span className="text-muted-foreground">{m.kind}</span> — {m.title}</div>)}<details className="mt-4"><summary className="cursor-pointer text-sm text-muted-foreground">Mostra contesto completo inviato al modello</summary><pre className="mt-3 whitespace-pre-wrap text-xs bg-black/60 p-4 overflow-auto max-h-96">{preview.context_preview}</pre></details></div>}
      </div>
    </div>
  );
}
