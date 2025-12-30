import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Palette, 
  Save,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Image,
  Type,
  MessageSquare,
  Sparkles,
  Swords,
  LogIn,
  Home
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const DEFAULT_SETTINGS = {
  event_name: "L'Archivio Maledetto",
  event_logo_url: null,
  primary_color: "#8a0000",
  secondary_color: "#000033",
  accent_color: "#b8860b",
  background_color: "#050505",
  hero_title: "Svela i Segreti",
  hero_subtitle: "dell'Antico Sapere",
  hero_description: "Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano.",
  chat_placeholder: "Poni la tua domanda all'Oracolo...",
  oracle_name: "L'Oracolo",
  background_image_url: null,
  event_window_start: null,
  event_window_end: null
};

export default function CustomizePanel({ token }) {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormData(prevFormData => {
      const newFormData = {
        ...DEFAULT_SETTINGS,
        ...settings
      };
      // Only update if the data has actually changed
      if (JSON.stringify(prevFormData) !== JSON.stringify(newFormData)) {
        return newFormData;
      }
      return prevFormData;
    });
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateSettings(formData, token);
    if (success) {
      toast.success("Impostazioni salvate!");
    } else {
      toast.error("Errore nel salvataggio");
    }
    setSaving(false);
  };

  const embedUrl = `${window.location.origin}/embed`;
  const embedCode = `<iframe 
  src="${embedUrl}" 
  style="width: 100%; height: 500px; border: none; border-radius: 8px;"
  title="${formData.event_name}"
></iframe>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Codice copiato!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-gold" />
          <h2 className="font-cinzel text-xl text-gold uppercase tracking-widest">
            Personalizzazione
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
          data-testid="save-settings-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          SALVA
        </Button>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="bg-card border border-border/50 rounded-sm mb-4 flex-wrap h-auto">
          <TabsTrigger value="identity" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <Type className="w-3 h-3 mr-1" /> Identità
          </TabsTrigger>
          <TabsTrigger value="colors" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <Palette className="w-3 h-3 mr-1" /> Colori
          </TabsTrigger>
          <TabsTrigger value="landing" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <Home className="w-3 h-3 mr-1" /> Landing
          </TabsTrigger>
          <TabsTrigger value="chat" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <MessageSquare className="w-3 h-3 mr-1" /> Chat
          </TabsTrigger>
          <TabsTrigger value="aids" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <Sparkles className="w-3 h-3 mr-1" /> Focalizzazioni
          </TabsTrigger>
          <TabsTrigger value="challenges" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <Swords className="w-3 h-3 mr-1" /> Prove
          </TabsTrigger>
          <TabsTrigger value="auth" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <LogIn className="w-3 h-3 mr-1" /> Auth
          </TabsTrigger>
          <TabsTrigger value="embed" className="font-cinzel text-xs data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <ExternalLink className="w-3 h-3 mr-1" /> Embed
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nome Evento</Label>
                <Input
                  value={formData.event_name || ""}
                  onChange={(e) => handleChange("event_name", e.target.value)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">URL Logo</Label>
                <Input
                  value={formData.event_logo_url || ""}
                  onChange={(e) => handleChange("event_logo_url", e.target.value)}
                  placeholder="https://..."
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nome Oracolo</Label>
                <Input
                  value={formData.oracle_name || ""}
                  onChange={(e) => handleChange("oracle_name", e.target.value)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">URL Immagine Sfondo</Label>
                <Input
                  value={formData.background_image_url || ""}
                  onChange={(e) => handleChange("background_image_url", e.target.value)}
                  placeholder="https://..."
                  className="input-gothic rounded-sm"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nav: Archivio</Label>
                <Input value={formData.nav_archive || ""} onChange={(e) => handleChange("nav_archive", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nav: Admin</Label>
                <Input value={formData.nav_admin || ""} onChange={(e) => handleChange("nav_admin", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nav: Esci</Label>
                <Input value={formData.nav_logout || ""} onChange={(e) => handleChange("nav_logout", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nav: Focalizzazioni</Label>
                <Input value={formData.nav_aids || ""} onChange={(e) => handleChange("nav_aids", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <div className="card-gothic rounded-sm p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "primary_color", label: "Primario" },
                { key: "secondary_color", label: "Secondario" },
                { key: "accent_color", label: "Accento" },
                { key: "background_color", label: "Sfondo" }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">{label}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData[key] || "#000000"}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <Input
                      value={formData[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="input-gothic rounded-sm flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Landing Tab */}
        <TabsContent value="landing">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Hero</Label>
                <Input value={formData.hero_title || ""} onChange={(e) => handleChange("hero_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Sottotitolo Hero</Label>
                <Input value={formData.hero_subtitle || ""} onChange={(e) => handleChange("hero_subtitle", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Descrizione Hero</Label>
              <Textarea value={formData.hero_description || ""} onChange={(e) => handleChange("hero_description", e.target.value)} className="input-gothic rounded-sm min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Pulsante CTA</Label>
              <Input value={formData.landing_cta || ""} onChange={(e) => handleChange("landing_cta", e.target.value)} className="input-gothic rounded-sm" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Feature 1 - Titolo</Label>
                <Input value={formData.landing_feature1_title || ""} onChange={(e) => handleChange("landing_feature1_title", e.target.value)} className="input-gothic rounded-sm" />
                <Textarea value={formData.landing_feature1_desc || ""} onChange={(e) => handleChange("landing_feature1_desc", e.target.value)} className="input-gothic rounded-sm min-h-[60px]" placeholder="Descrizione" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Feature 2 - Titolo</Label>
                <Input value={formData.landing_feature2_title || ""} onChange={(e) => handleChange("landing_feature2_title", e.target.value)} className="input-gothic rounded-sm" />
                <Textarea value={formData.landing_feature2_desc || ""} onChange={(e) => handleChange("landing_feature2_desc", e.target.value)} className="input-gothic rounded-sm min-h-[60px]" placeholder="Descrizione" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Feature 3 - Titolo</Label>
                <Input value={formData.landing_feature3_title || ""} onChange={(e) => handleChange("landing_feature3_title", e.target.value)} className="input-gothic rounded-sm" />
                <Textarea value={formData.landing_feature3_desc || ""} onChange={(e) => handleChange("landing_feature3_desc", e.target.value)} className="input-gothic rounded-sm min-h-[60px]" placeholder="Descrizione" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Placeholder Chat</Label>
                <Input value={formData.chat_placeholder || ""} onChange={(e) => handleChange("chat_placeholder", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Messaggio Attesa</Label>
                <Input value={formData.chat_waiting_message || ""} onChange={(e) => handleChange("chat_waiting_message", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Messaggio Caricamento</Label>
                <Input value={formData.chat_loading_message || ""} onChange={(e) => handleChange("chat_loading_message", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Azioni Esaurite</Label>
                <Input value={formData.actions_exhausted || ""} onChange={(e) => handleChange("actions_exhausted", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Archivio</Label>
                <Input value={formData.archive_title || ""} onChange={(e) => handleChange("archive_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Seleziona Consultazione</Label>
                <Input value={formData.archive_select || ""} onChange={(e) => handleChange("archive_select", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Descrizione Selezione Archivio</Label>
              <Textarea value={formData.archive_select_desc || ""} onChange={(e) => handleChange("archive_select_desc", e.target.value)} className="input-gothic rounded-sm" />
            </div>
          </div>
        </TabsContent>

        {/* Aids Tab */}
        <TabsContent value="aids">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Focalizzazioni</Label>
                <Input value={formData.aids_title || ""} onChange={(e) => handleChange("aids_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Focalizzazione Ottenuta</Label>
                <Input value={formData.aids_obtained || ""} onChange={(e) => handleChange("aids_obtained", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Inizio Evento Live (data/ora)</Label>
                <Input
                  type="datetime-local"
                  value={formData.event_window_start || ""}
                  onChange={(e) => handleChange("event_window_start", e.target.value)}
                  className="input-gothic rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Fine Evento Live (data/ora)</Label>
                <Input
                  type="datetime-local"
                  value={formData.event_window_end || ""}
                  onChange={(e) => handleChange("event_window_end", e.target.value)}
                  className="input-gothic rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Sottotitolo</Label>
              <Textarea value={formData.aids_subtitle || ""} onChange={(e) => handleChange("aids_subtitle", e.target.value)} className="input-gothic rounded-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Label Input Valore</Label>
              <Input value={formData.aids_input_label || ""} onChange={(e) => handleChange("aids_input_label", e.target.value)} className="input-gothic rounded-sm" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Nessuna Attiva</Label>
                <Input value={formData.aids_no_active || ""} onChange={(e) => handleChange("aids_no_active", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Descrizione Nessuna Attiva</Label>
                <Input value={formData.aids_no_active_desc || ""} onChange={(e) => handleChange("aids_no_active_desc", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Prova</Label>
                <Input value={formData.challenge_title || ""} onChange={(e) => handleChange("challenge_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Pulsante Lancia Dadi</Label>
                <Input value={formData.challenge_roll_btn || ""} onChange={(e) => handleChange("challenge_roll_btn", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Testo Successo</Label>
                <Input value={formData.challenge_success || ""} onChange={(e) => handleChange("challenge_success", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Testo Parità</Label>
                <Input value={formData.challenge_tie || ""} onChange={(e) => handleChange("challenge_tie", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Testo Fallimento</Label>
                <Input value={formData.challenge_failure || ""} onChange={(e) => handleChange("challenge_failure", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Auth Tab */}
        <TabsContent value="auth">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Login</Label>
                <Input value={formData.auth_login_title || ""} onChange={(e) => handleChange("auth_login_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Titolo Registrazione</Label>
                <Input value={formData.auth_register_title || ""} onChange={(e) => handleChange("auth_register_title", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Pulsante Login</Label>
                <Input value={formData.auth_login_btn || ""} onChange={(e) => handleChange("auth_login_btn", e.target.value)} className="input-gothic rounded-sm" />
              </div>
              <div className="space-y-2">
                <Label className="font-cinzel text-gold text-xs uppercase">Pulsante Registrazione</Label>
                <Input value={formData.auth_register_btn || ""} onChange={(e) => handleChange("auth_register_btn", e.target.value)} className="input-gothic rounded-sm" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Embed Tab */}
        <TabsContent value="embed">
          <div className="card-gothic rounded-sm p-6 space-y-4">
            <p className="font-body text-muted-foreground text-sm">
              Copia questo codice e incollalo nel tuo sito HTML per integrare la chat.
            </p>
            
            <div className="relative">
              <pre className="bg-black/50 p-4 rounded-sm text-sm text-parchment overflow-x-auto border border-border/50">
                <code>{embedCode}</code>
              </pre>
              <Button
                onClick={copyEmbedCode}
                size="sm"
                className="absolute top-2 right-2 bg-secondary hover:bg-secondary/80"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <a 
              href={embedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gold hover:text-gold/80 text-sm font-cinzel flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Anteprima Embed
            </a>

            <div className="mt-4">
              <Label className="font-cinzel text-gold text-xs uppercase mb-3 block">Anteprima</Label>
              <div className="border border-border/50 rounded-sm overflow-hidden" style={{ height: "350px" }}>
                <iframe src={embedUrl} style={{ width: "100%", height: "100%", border: "none" }} title="Anteprima" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
