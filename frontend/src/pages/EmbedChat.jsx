import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare, LogIn, Shield } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmbedChat() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const hideAuth = searchParams.get("hideAuth") === "true";
  
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("embed_token"));
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Auth form
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (token) {
      checkAuth();
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem("embed_token");
        setToken(null);
      }
    } catch (e) {
      localStorage.removeItem("embed_token");
      setToken(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = showLogin ? "/auth/login" : "/auth/register";
    const body = showLogin 
      ? { email, password }
      : { email, password, username };

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("embed_token", data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        toast.success(showLogin ? "Accesso riuscito!" : "Registrazione completata!");
      } else {
        toast.error(data.detail || "Errore");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const remainingActions = user.max_actions - user.used_actions;
    if (remainingActions <= 0) {
      toast.error("Hai esaurito le tue azioni disponibili");
      return;
    }

    const userMessage = { type: "user", text: question };
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
        setMessages(prev => [...prev, { type: "ai", text: data.answer }]);
        setUser(prev => ({ ...prev, used_actions: prev.used_actions + 1 }));
      } else {
        toast.error(data.detail || "Errore");
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      toast.error("Errore di connessione");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const [remainingActions, setRemainingActions] = useState(user ? user.max_actions - user.used_actions : 0);
  const [effectiveMaxActions, setEffectiveMaxActions] = useState(user?.max_actions || 0);

  // Custom styles based on settings
  const customStyles = {

  useEffect(() => {
    if (!user) return;
    const fetchFollowerStatus = async () => {
      try {
        const response = await fetch(`${API}/followers/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const effMax = data.remaining_actions_before + user.used_actions;
          setRemainingActions(data.remaining_actions_before);
          setEffectiveMaxActions(effMax);
        } else {
          const baseRemaining = user.max_actions - user.used_actions;
          setRemainingActions(baseRemaining);
          setEffectiveMaxActions(user.max_actions);
        }
      } catch (error) {
        const baseRemaining = user.max_actions - user.used_actions;
        setRemainingActions(baseRemaining);
        setEffectiveMaxActions(user.max_actions);
      }
    };

    fetchFollowerStatus();
  }, [user, token]);

    "--primary-custom": settings.primary_color,
    "--secondary-custom": settings.secondary_color,
    "--accent-custom": settings.accent_color,
    "--bg-custom": settings.background_color
  };

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: settings.background_color }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.accent_color }} />
      </div>
    );
  }

  // Auth form for embed
  if (!user) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: settings.background_color, ...customStyles }}
        data-testid="embed-auth"
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            {settings.event_logo_url ? (
              <img src={settings.event_logo_url} alt={settings.event_name} className="h-12 mx-auto mb-3" />
            ) : (
              <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: settings.accent_color }} />
            )}
            <h2 className="font-gothic text-xl" style={{ color: settings.accent_color }}>
              {settings.event_name}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!showLogin && (
              <Input
                placeholder="Nome utente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!showLogin}
                className="bg-black/50 border-gray-700 text-white"
                data-testid="embed-username"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/50 border-gray-700 text-white"
              data-testid="embed-email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/50 border-gray-700 text-white"
              data-testid="embed-password"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              style={{ backgroundColor: settings.primary_color }}
              data-testid="embed-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {showLogin ? "Accedi" : "Registrati"}
                </>
              )}
            </Button>
          </form>

          <p className="text-center mt-4 text-sm text-gray-400">
            {showLogin ? "Non hai un account? " : "Hai già un account? "}
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="underline"
              style={{ color: settings.accent_color }}
            >
              {showLogin ? "Registrati" : "Accedi"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Chat interface for embed
  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: settings.background_color, ...customStyles }}
      data-testid="embed-chat"
    >
      {/* Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: `${settings.accent_color}33`, backgroundColor: `${settings.background_color}ee` }}
      >
        <div className="flex items-center gap-2">
          {settings.event_logo_url ? (
            <img src={settings.event_logo_url} alt="" className="h-6" />
          ) : (
            <MessageSquare className="w-5 h-5" style={{ color: settings.accent_color }} />
          )}
          <span className="font-cinzel text-sm" style={{ color: settings.accent_color }}>
            {settings.event_name}
          </span>
        </div>
        <div 
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{ backgroundColor: `${settings.secondary_color}66` }}
        >
          <Shield className="w-3 h-3" style={{ color: settings.accent_color }} />
          <span style={{ color: settings.accent_color }}>{remainingActions}/{effectiveMaxActions}</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" style={{ color: settings.accent_color }} />
            <p className="text-sm text-gray-500">{settings.chat_placeholder}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] p-3 rounded text-sm"
                  style={{
                    backgroundColor: msg.type === "user" ? settings.secondary_color : "#1a1a1a",
                    color: msg.type === "user" ? settings.accent_color : "#e5e5e5",
                    border: `1px solid ${msg.type === "user" ? settings.accent_color + "33" : "#333"}`
                  }}
                >
                  <p className="text-xs mb-1 opacity-60">
                    {msg.type === "user" ? user.username : settings.oracle_name}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 rounded text-sm" style={{ backgroundColor: "#1a1a1a" }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: settings.accent_color }} />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: `${settings.accent_color}22` }}>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={settings.chat_placeholder}
            disabled={loading || remainingActions <= 0}
            className="resize-none min-h-[44px] max-h-[100px] bg-black/50 border-gray-700 text-white text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            data-testid="embed-input"
          />
          <Button
            type="submit"
            disabled={loading || !question.trim() || remainingActions <= 0}
            className="px-3"
            style={{ backgroundColor: settings.primary_color }}
            data-testid="embed-send"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        {remainingActions <= 0 && (
          <p className="text-xs mt-2 text-center" style={{ color: settings.primary_color }}>
            Azioni esaurite per questo mese
          </p>
        )}
      </div>
    </div>
  );
}
