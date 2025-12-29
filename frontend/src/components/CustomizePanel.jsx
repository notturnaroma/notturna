import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Palette, 
  Save,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Image,
  Type
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function CustomizePanel({ token }) {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <div className="space-y-8">
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

      {/* Identity Section */}
      <section className="card-gothic rounded-sm p-6">
        <h3 className="font-cinzel text-gold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
          <Type className="w-4 h-4" /> Identità Evento
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Nome Evento</Label>
            <Input
              value={formData.event_name}
              onChange={(e) => handleChange("event_name", e.target.value)}
              className="input-gothic rounded-sm"
              data-testid="setting-event-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">URL Logo (opzionale)</Label>
            <Input
              value={formData.event_logo_url || ""}
              onChange={(e) => handleChange("event_logo_url", e.target.value || null)}
              placeholder="https://..."
              className="input-gothic rounded-sm"
              data-testid="setting-logo-url"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Nome Oracolo</Label>
            <Input
              value={formData.oracle_name}
              onChange={(e) => handleChange("oracle_name", e.target.value)}
              className="input-gothic rounded-sm"
              data-testid="setting-oracle-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Placeholder Chat</Label>
            <Input
              value={formData.chat_placeholder}
              onChange={(e) => handleChange("chat_placeholder", e.target.value)}
              className="input-gothic rounded-sm"
              data-testid="setting-chat-placeholder"
            />
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="card-gothic rounded-sm p-6">
        <h3 className="font-cinzel text-gold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
          <Palette className="w-4 h-4" /> Colori
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Primario</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="w-12 h-10 rounded cursor-pointer bg-transparent"
                data-testid="setting-primary-color"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="input-gothic rounded-sm flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Secondario</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                className="w-12 h-10 rounded cursor-pointer bg-transparent"
                data-testid="setting-secondary-color"
              />
              <Input
                value={formData.secondary_color}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                className="input-gothic rounded-sm flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Accento</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.accent_color}
                onChange={(e) => handleChange("accent_color", e.target.value)}
                className="w-12 h-10 rounded cursor-pointer bg-transparent"
                data-testid="setting-accent-color"
              />
              <Input
                value={formData.accent_color}
                onChange={(e) => handleChange("accent_color", e.target.value)}
                className="input-gothic rounded-sm flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Sfondo</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.background_color}
                onChange={(e) => handleChange("background_color", e.target.value)}
                className="w-12 h-10 rounded cursor-pointer bg-transparent"
                data-testid="setting-background-color"
              />
              <Input
                value={formData.background_color}
                onChange={(e) => handleChange("background_color", e.target.value)}
                className="input-gothic rounded-sm flex-1"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="card-gothic rounded-sm p-6">
        <h3 className="font-cinzel text-gold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
          <Image className="w-4 h-4" /> Testi & Immagini
        </h3>
        
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Titolo Hero</Label>
              <Input
                value={formData.hero_title}
                onChange={(e) => handleChange("hero_title", e.target.value)}
                className="input-gothic rounded-sm"
                data-testid="setting-hero-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-cinzel text-gold text-xs uppercase">Sottotitolo Hero</Label>
              <Input
                value={formData.hero_subtitle}
                onChange={(e) => handleChange("hero_subtitle", e.target.value)}
                className="input-gothic rounded-sm"
                data-testid="setting-hero-subtitle"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Descrizione Hero</Label>
            <Textarea
              value={formData.hero_description}
              onChange={(e) => handleChange("hero_description", e.target.value)}
              className="input-gothic rounded-sm min-h-[100px]"
              data-testid="setting-hero-description"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">URL Immagine Sfondo (opzionale)</Label>
            <Input
              value={formData.background_image_url || ""}
              onChange={(e) => handleChange("background_image_url", e.target.value || null)}
              placeholder="https://..."
              className="input-gothic rounded-sm"
              data-testid="setting-background-image"
            />
          </div>
        </div>
      </section>

      {/* Embed Code Section */}
      <section className="card-gothic rounded-sm p-6">
        <h3 className="font-cinzel text-gold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" /> Codice Embed
        </h3>
        
        <p className="font-body text-muted-foreground text-sm mb-4">
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
            data-testid="copy-embed-btn"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="mt-4 flex gap-4">
          <a 
            href={embedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gold hover:text-gold/80 text-sm font-cinzel flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Anteprima Embed
          </a>
        </div>

        {/* Preview */}
        <div className="mt-6">
          <Label className="font-cinzel text-gold text-xs uppercase mb-3 block">Anteprima</Label>
          <div 
            className="border border-border/50 rounded-sm overflow-hidden"
            style={{ height: "400px" }}
          >
            <iframe
              src={embedUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Anteprima Embed"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
