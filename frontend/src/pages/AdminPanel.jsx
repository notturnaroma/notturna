import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  BookOpen, 
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Loader2,
  Shield,
  Crown,
  Palette,
  Swords,
  FileText,
  FileImage,
  FileVideo,
  File,
  ExternalLink,
  Sparkles,
  Coins
} from "lucide-react";
import CustomizePanel from "@/components/CustomizePanel";
import ChallengesPanel from "@/components/ChallengesPanel";
import AidsPanel from "@/components/AidsPanel";
import ResourcesPanel from "@/components/ResourcesPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPanel({ user, token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Knowledge form
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const [kbCategory, setKbCategory] = useState("general");
  const [kbRequiredContacts, setKbRequiredContacts] = useState([]);
  const [kbRequiredMentor, setKbRequiredMentor] = useState("");
  const [kbRequiredNotoriety, setKbRequiredNotoriety] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, kbRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/knowledge`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (kbRes.ok) setKnowledge(await kbRes.json());
    } catch (error) {
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: kbTitle,
          content: kbContent,
          category: kbCategory,
          file_type: "text",
          file_url: null,
          required_contacts: kbRequiredContacts
            .filter(c => c.name.trim())
            .map(c => ({ name: c.name.trim(), value: parseInt(c.value) || 1 })),
          required_mentor: kbRequiredMentor === "" ? null : parseInt(kbRequiredMentor),
          required_notoriety: kbRequiredNotoriety === "" ? null : parseInt(kbRequiredNotoriety)
        })
      });

      if (response.ok) {
        toast.success("Documento aggiunto");
        setKbTitle("");
        setKbContent("");
        setKbCategory("general");
        fetchData();
      } else {
        const data = await response.json();
        toast.error("Errore", { description: data.detail });
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File troppo grande", { description: "Massimo 50MB" });
      return;
    }

    toast.info("Caricamento in corso...", { duration: 2000 });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API}/knowledge/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success("File caricato con successo");
        fetchData();
        e.target.value = ""; // Reset input
      } else {
        const data = await response.json();
        toast.error("Errore", { description: data.detail });
      }
    } catch (error) {
      toast.error("Errore nel caricamento");
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf": return <FileText className="w-4 h-4 text-red-400" />;
      case "image": return <FileImage className="w-4 h-4 text-green-400" />;
      case "video": return <FileVideo className="w-4 h-4 text-blue-400" />;
      default: return <File className="w-4 h-4 text-gold" />;
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo documento?")) return;

    try {
      const response = await fetch(`${API}/knowledge/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Documento eliminato");
        fetchData();
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleUpdateActions = async (userId, maxActions) => {
    try {
      const response = await fetch(`${API}/admin/users/${userId}/actions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ max_actions: parseInt(maxActions) })
      });

      if (response.ok) {
        toast.success("Azioni aggiornate");
        fetchData();
      }
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleResetActions = async (userId) => {
    try {
      const response = await fetch(`${API}/admin/users/${userId}/reset-actions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Azioni resettate");
        fetchData();
      }
    } catch (error) {
      toast.error("Errore nel reset");
    }
  };
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo PG?")) return;

    try {
      const response = await fetch(`${API}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Utente eliminato");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Errore nell'eliminazione utente");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };



  const handleUpdateRole = async (userId, role) => {
    try {
      const response = await fetch(`${API}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        toast.success("Ruolo aggiornato");
        fetchData();
      }
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  return (
    <div className="min-h-screen bg-void stone-texture">
      {/* Navigation */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10" data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-cinzel">INDIETRO</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gold" />
              <h1 className="font-gothic text-xl md:text-2xl text-gold">
                Pannello Admin
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="knowledge" className="w-full">
          <TabsList className="bg-card border border-border/50 rounded-sm mb-6">
            <TabsTrigger 
              value="knowledge" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="knowledge-tab"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              KNOWLEDGE BASE
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="users-tab"
            >
              <Users className="w-4 h-4 mr-2" />
              UTENTI
            </TabsTrigger>
            <TabsTrigger 
              value="customize" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="customize-tab"
            >
              <Palette className="w-4 h-4 mr-2" />
              PERSONALIZZA
            </TabsTrigger>
            <TabsTrigger 
              value="challenges" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="challenges-tab"
            >
              <Swords className="w-4 h-4 mr-2" />
              PROVE
            </TabsTrigger>
            <TabsTrigger 
              value="aids" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="aids-tab"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AIUTI
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              className="font-cinzel data-[state=active]:bg-gold/20 data-[state=active]:text-gold rounded-sm"
              data-testid="resources-tab"
            >
              <Coins className="w-4 h-4 mr-2" />
              RISORSE
            </TabsTrigger>
          </TabsList>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            {/* Add Knowledge Form */}
            <div className="card-gothic rounded-sm p-6" data-testid="add-knowledge-form">
              <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm mb-6">
                Aggiungi Documento
              </h2>
              
              <form onSubmit={handleAddKnowledge} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-cinzel text-gold text-xs uppercase">Titolo</Label>
                    <Input
                      value={kbTitle}
                      onChange={(e) => setKbTitle(e.target.value)}
                      placeholder="Titolo del documento"
                      className="input-gothic rounded-sm"
                      data-testid="kb-title-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-cinzel text-gold text-xs uppercase">Categoria</Label>
                    <Select value={kbCategory} onValueChange={setKbCategory}>
                      <SelectTrigger className="input-gothic rounded-sm" data-testid="kb-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="general">Generale</SelectItem>
                        <SelectItem value="rules">Regole</SelectItem>
                        <SelectItem value="lore">Lore</SelectItem>
                        <SelectItem value="characters">Personaggi</SelectItem>
                        <SelectItem value="locations">Luoghi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-cinzel text-gold text-xs uppercase">Contenuto</Label>
                  <Textarea
                    value={kbContent}
                    onChange={(e) => setKbContent(e.target.value)}
                    placeholder="Inserisci il contenuto del documento..."
                    className="input-gothic rounded-sm min-h-[150px]"
                    data-testid="kb-content-input"
                  />

                {/* Restrizioni di accesso opzionali */}
                <div className="space-y-3 border border-border/30 rounded-sm p-4 mt-2">
                  <p className="font-cinzel text-gold text-xs uppercase tracking-widest">Restrizioni di accesso (opzionali)</p>
                  <p className="font-body text-xs text-muted-foreground">
                    Se lasci tutti i campi vuoti, il documento sarà accessibile a tutti i PG.
                  </p>

                  {/* Contatti richiesti */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-cinzel text-gold text-xs uppercase">Contatti richiesti</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setKbRequiredContacts(prev => [...prev, { name: "", value: 1 }])}
                        className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Aggiungi contatto
                      </Button>
                    </div>
                    {kbRequiredContacts.length === 0 && (
                      <p className="font-body text-xs text-muted-foreground">
                        Nessun contatto richiesto.
                      </p>
                    )}
                    <div className="space-y-2">
                      {kbRequiredContacts.map((c, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                          <Input
                            value={c.name}
                            onChange={(e) => setKbRequiredContacts(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                            placeholder="es. polizia, criminalità..."
                            className="input-gothic rounded-sm"
                          />
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={c.value}
                            onChange={(e) => setKbRequiredContacts(prev => prev.map((item, i) => i === idx ? { ...item, value: parseInt(e.target.value) || 1 } : item))}
                            className="w-20 input-gothic rounded-sm text-center"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setKbRequiredContacts(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mentor / Notorietà richiesti */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-cinzel text-gold text-xs uppercase">MENTORE minimo (0–5)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={kbRequiredMentor}
                        onChange={(e) => setKbRequiredMentor(e.target.value)}
                        className="input-gothic rounded-sm"
                        placeholder="lascia vuoto per nessun requisito"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-cinzel text-gold text-xs uppercase">NOTORIETÀ minima (0–5)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={kbRequiredNotoriety}
                        onChange={(e) => setKbRequiredNotoriety(e.target.value)}
                        className="input-gothic rounded-sm"
                        placeholder="lascia vuoto per nessun requisito"
                      />
                    </div>
                  </div>
                </div>
              </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                    data-testid="kb-submit-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    AGGIUNGI TESTO
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi"
                      onChange={handleUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      data-testid="kb-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm font-cinzel"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      CARICA FILE
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Formati supportati: TXT, MD, PDF, JPG, PNG, GIF, WEBP, MP4, WEBM, MOV (max 50MB)
                </p>
              </form>
            </div>

            {/* Knowledge List */}
            <div className="card-gothic rounded-sm overflow-hidden" data-testid="knowledge-list">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm">
                  Documenti ({knowledge.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchData}
                  className="text-gold hover:bg-gold/10"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                  </div>
                ) : knowledge.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-cinzel text-muted-foreground">Nessun documento</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {knowledge.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-gold/5 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getFileIcon(doc.file_type)}
                              <h3 className="font-cinzel text-parchment">{doc.title}</h3>
                            </div>
                            
                            {/* Preview per immagini */}
                            {doc.file_type === "image" && doc.file_url && (
                              <div className="my-2">
                                <img 
                                  src={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                                  alt={doc.title}
                                  className="max-h-32 rounded border border-border/50"
                                />
                              </div>
                            )}
                            
                            {/* Preview per video */}
                            {doc.file_type === "video" && doc.file_url && (
                              <div className="my-2">
                                <video 
                                  src={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                                  controls
                                  className="max-h-32 rounded border border-border/50"
                                />
                              </div>
                            )}
                            
                            {/* Contenuto testo */}
                            {(doc.file_type === "text" || doc.file_type === "pdf") && (
                              <p className="font-body text-muted-foreground text-sm line-clamp-2 mb-2">
                                {doc.content}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="font-cinzel uppercase bg-secondary/50 px-2 py-1 rounded">
                                {doc.category}
                              </span>
                              <span className="bg-black/30 px-2 py-1 rounded">
                                {doc.file_type || "text"}
                              </span>
                              <span>di {doc.created_by}</span>
                              {doc.file_url && (
                                <a 
                                  href={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gold hover:text-gold/80 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Apri
                                </a>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKnowledge(doc.id)}
                            className="text-primary hover:bg-primary/10"
                            data-testid={`delete-kb-${doc.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="card-gothic rounded-sm overflow-hidden" data-testid="users-list">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm">
                  Gestione Utenti ({users.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchData}
                  className="text-gold hover:bg-gold/10"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 hover:bg-gold/5 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                              u.role === "admin" ? "bg-gold/20" : "bg-secondary/50"
                            }`}>
                              {u.role === "admin" ? (
                                <Crown className="w-5 h-5 text-gold" />
                              ) : (
                                <Shield className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-500 hover:bg-red-500/10"
                              data-testid={`delete-user-${u.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            <div>
                              <h3 className="font-cinzel text-parchment">{u.username}</h3>
                              <p className="font-body text-muted-foreground text-sm">{u.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Role Select */}
                            <Select
                              value={u.role}
                              onValueChange={(val) => handleUpdateRole(u.id, val)}
                            >
                              <SelectTrigger className="w-[120px] input-gothic rounded-sm text-sm" data-testid={`role-select-${u.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="player">Giocatore</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <span className="font-body text-muted-foreground text-sm">
                                {u.used_actions}/{u.max_actions}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                defaultValue={u.max_actions}
                                onBlur={(e) => handleUpdateActions(u.id, e.target.value)}
                                className="w-20 input-gothic rounded-sm text-sm"
                                data-testid={`actions-input-${u.id}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetActions(u.id)}
                                className="border-gold/50 text-gold hover:bg-gold/10 rounded-sm"
                                data-testid={`reset-btn-${u.id}`}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize">
            <CustomizePanel token={token} />
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <ChallengesPanel token={token} />
          </TabsContent>

          {/* Aids Tab */}
          <TabsContent value="aids">
            <AidsPanel token={token} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
