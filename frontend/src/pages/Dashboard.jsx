import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Send, 
  Archive, 
  LogOut, 
  Settings, 
  Scroll,
  Loader2,
  Shield,
  MessageSquare
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ user, token, onLogout, refreshUser }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const remainingActions = user ? user.max_actions - user.used_actions : 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    if (remainingActions <= 0) {
      toast.error("Azioni esaurite", { 
        description: "Hai esaurito tutte le tue azioni disponibili" 
      });
      return;
    }

    const userMessage = { type: "user", text: question, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: userMessage.text })
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage = { type: "ai", text: data.answer, timestamp: data.created_at };
        setMessages(prev => [...prev, aiMessage]);
        refreshUser();
      } else {
        toast.error("Errore", { description: data.detail || "Errore nella richiesta" });
        // Remove the user message if request failed
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      toast.error("Errore di connessione", { description: "Impossibile contattare il server" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void stone-texture flex flex-col">
      {/* Navigation */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Scroll className="w-8 h-8 text-gold" />
            <h1 className="font-gothic text-xl md:text-2xl text-gold hidden sm:block">
              L'Archivio
            </h1>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Actions Counter */}
            <div className="stat-card px-3 py-2 rounded-sm flex items-center gap-2" data-testid="actions-counter">
              <Shield className="w-4 h-4 text-gold" />
              <span className="font-cinzel text-sm text-parchment">
                <span className="text-gold">{remainingActions}</span>/{user?.max_actions}
              </span>
            </div>

            <Link to="/archive">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gold hover:bg-gold/10 font-cinzel"
                data-testid="archive-nav-btn"
              >
                <Archive className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">ARCHIVIO</span>
              </Button>
            </Link>

            {user?.role === "admin" && (
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gold hover:bg-gold/10 font-cinzel"
                  data-testid="admin-nav-btn"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ADMIN</span>
                </Button>
              </Link>
            )}

            <Button 
              variant="ghost" 
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-cinzel"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">ESCI</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="text-center mb-6 fade-in">
          <h2 className="font-gothic text-3xl md:text-4xl text-gold mb-2">
            Benvenuto, {user?.username}
          </h2>
          <p className="font-body text-muted-foreground">
            Poni le tue domande all'Oracolo dell'Archivio
          </p>
        </div>

        {/* Chat Container */}
        <div className="card-gothic flex-1 flex flex-col rounded-sm overflow-hidden glow-gold" data-testid="chat-container">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <MessageSquare className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="font-cinzel text-muted-foreground text-lg mb-2">
                  L'Oracolo è in attesa
                </p>
                <p className="font-body text-muted-foreground/70 text-sm max-w-md">
                  Poni la tua domanda e l'Oracolo consulterà gli antichi tomi 
                  per fornirti una risposta.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`fade-in ${msg.type === "user" ? "flex justify-end" : "flex justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-4 rounded-sm ${
                        msg.type === "user"
                          ? "chat-message-user text-gold"
                          : "chat-message-ai text-parchment"
                      }`}
                      data-testid={msg.type === "user" ? "user-message" : "ai-message"}
                    >
                      <p className="font-cinzel text-xs mb-2 opacity-70 uppercase tracking-wide">
                        {msg.type === "user" ? user?.username : "L'Oracolo"}
                      </p>
                      <p className="font-body whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start fade-in">
                    <div className="chat-message-ai text-parchment p-4 rounded-sm">
                      <p className="font-cinzel text-xs mb-2 opacity-70 uppercase tracking-wide">
                        L'Oracolo
                      </p>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        <span className="font-body text-muted-foreground">
                          Consulto gli antichi tomi...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 bg-black/30">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Poni la tua domanda all'Oracolo..."
                className="input-gothic rounded-sm resize-none min-h-[50px] max-h-[120px]"
                disabled={loading || remainingActions <= 0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                data-testid="chat-input"
              />
              <Button
                type="submit"
                disabled={loading || !question.trim() || remainingActions <= 0}
                className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic px-6"
                data-testid="send-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            {remainingActions <= 0 && (
              <p className="text-primary font-cinzel text-sm mt-2 text-center">
                Hai esaurito le tue azioni disponibili
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
