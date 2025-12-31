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
  MessageSquare,
  Swords,
  Sparkles
} from "lucide-react";
import ChallengeModal from "@/components/ChallengeModal";
import AidsModal from "@/components/AidsModal";
import { useSettings } from "@/context/SettingsContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ user, token, onLogout, refreshUser }) {
  const { settings } = useSettings();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [attemptedChallenges, setAttemptedChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [showAidsModal, setShowAidsModal] = useState(false);
  const [remainingActions, setRemainingActions] = useState(user ? user.max_actions - user.used_actions : 0);
  const [effectiveMaxActions, setEffectiveMaxActions] = useState(user?.max_actions || 0);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchChallenges();
    fetchAttemptedChallenges();
  }, []);

  // Aggiorna il conteggio azioni tenendo conto dei SEGUACI
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChallenges = async () => {
    try {
      const response = await fetch(`${API}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setChallenges(await response.json());
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  };

  const fetchAttemptedChallenges = async () => {
    try {
      const response = await fetch(`${API}/challenges/my-attempts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setAttemptedChallenges(await response.json());
      }
    } catch (error) {
      console.error("Error fetching attempted challenges:", error);
    }
  };

  // Cerca prove che corrispondono alla domanda (escluse quelle già tentate)
  const findMatchingChallenge = (text) => {
    const textLower = text.toLowerCase();
    for (const challenge of challenges) {
      // Salta se già tentata
      if (attemptedChallenges.includes(challenge.id)) {
        continue;
      }
      // Cerca nelle keywords
      for (const kw of challenge.keywords || []) {
        if (textLower.includes(kw.toLowerCase())) {
          return challenge;
        }
      }
      // Cerca nel nome
      if (textLower.includes(challenge.name.toLowerCase())) {
        return challenge;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    if (remainingActions <= 0) {
      toast.error(settings.actions_exhausted || "Hai esaurito le tue azioni disponibili");
      return;
    }

    // Controlla se la domanda corrisponde a una prova
    const matchedChallenge = findMatchingChallenge(question);
    if (matchedChallenge) {
      const userMessage = { type: "user", text: question, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, userMessage]);
      
      // Mostra la prova trovata
      const challengeMessage = { 
        type: "challenge", 
        challenge: matchedChallenge,
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, challengeMessage]);
      setQuestion("");
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
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      toast.error("Errore di connessione", { description: "Impossibile contattare il server" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = (challenge) => {
    setActiveChallenge(challenge);
  };

  const handleChallengeResult = (result) => {
    // Aggiungi il risultato alla chat
    const resultMessage = {
      type: "challenge-result",
      result: result,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, resultMessage]);
    // Aggiorna la lista delle prove tentate
    if (activeChallenge) {
      setAttemptedChallenges(prev => [...prev, activeChallenge.id]);
    }
    refreshUser();
  };

  const handleCloseChallenge = () => {
    setActiveChallenge(null);
  };

  const handleAidResult = (result) => {
    const aidMessage = {
      type: "aid-result",
      result: result,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, aidMessage]);
  };

  return (
    <div className="min-h-screen bg-void stone-texture flex flex-col">
      {/* Navigation */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            {settings.event_logo_url ? (
              <img src={settings.event_logo_url} alt="" className="h-8" />
            ) : (
              <Scroll className="w-8 h-8 text-gold" />
            )}
            <h1 className="font-gothic text-xl md:text-2xl text-gold hidden sm:block">
              {settings.event_name}
            </h1>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Actions Counter */}
            <div className="stat-card px-3 py-2 rounded-sm flex items-center gap-2" data-testid="actions-counter">
              <Shield className="w-4 h-4 text-gold" />
              <span className="font-cinzel text-sm text-parchment">
                <span className="text-gold">{remainingActions}</span>/{effectiveMaxActions}
              </span>
            </div>

            {/* Aiuti Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAidsModal(true)}
              className="text-gold hover:bg-gold/10 font-cinzel"
              data-testid="aids-nav-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{settings.nav_aids || "FOCALIZZAZIONI"}</span>
            </Button>

            <Link to="/background">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gold hover:bg-gold/10 font-cinzel"
                data-testid="background-nav-btn"
              >
                <Scroll className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{settings.nav_background || "BACKGROUND"}</span>
              </Button>
            </Link>

            <Link to="/archive">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gold hover:bg-gold/10 font-cinzel"
                data-testid="archive-nav-btn"
              >
                <Archive className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{settings.nav_archive || "ARCHIVIO"}</span>
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
                  <span className="hidden sm:inline">{settings.nav_admin || "ADMIN"}</span>
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
              <span className="hidden sm:inline">{settings.nav_logout || "ESCI"}</span>
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
            Poni le tue domande a {settings.oracle_name}
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
                  {settings.oracle_name} {settings.chat_waiting_message || "è in attesa"}
                </p>
                <p className="font-body text-muted-foreground/70 text-sm max-w-md">
                  {settings.chat_placeholder}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className="fade-in">
                    {/* Messaggio utente */}
                    {msg.type === "user" && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] md:max-w-[75%] p-4 rounded-sm chat-message-user text-gold">
                          <p className="font-cinzel text-xs mb-2 opacity-70 uppercase tracking-wide">
                            {user?.username}
                          </p>
                          <p className="font-body whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Messaggio AI */}
                    {msg.type === "ai" && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] md:max-w-[75%] p-4 rounded-sm chat-message-ai text-parchment">
                          <p className="font-cinzel text-xs mb-2 opacity-70 uppercase tracking-wide">
                            {settings.oracle_name}
                          </p>
                          <p className="font-body whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Prova trovata */}
                    {msg.type === "challenge" && (
                      <div className="flex justify-start">
                        <div className="max-w-[90%] p-4 rounded-sm bg-secondary/30 border border-gold/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Swords className="w-5 h-5 text-gold" />
                            <p className="font-cinzel text-gold uppercase tracking-wide text-sm">
                              {settings.challenge_title || "Prova Richiesta"}
                            </p>
                          </div>
                          <p className="font-gothic text-xl text-parchment mb-2">
                            {msg.challenge.name}
                          </p>
                          <p className="font-body text-muted-foreground mb-4">
                            {msg.challenge.description}
                          </p>
                          <div className="space-y-2 mb-4">
                            {msg.challenge.tests.map((test, i) => (
                              <div key={i} className="text-sm p-2 bg-black/30 rounded">
                                <span className="text-gold font-cinzel">PROVA {i + 1}:</span>{" "}
                                <span className="text-parchment">{test.attribute}</span>{" "}
                                <span className="text-muted-foreground">(difficoltà {test.difficulty})</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            onClick={() => handleStartChallenge(msg.challenge)}
                            className="bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic font-cinzel"
                            data-testid="start-challenge-btn"
                          >
                            <Swords className="w-4 h-4 mr-2" />
                            AFFRONTA LA PROVA
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Risultato prova */}
                    {msg.type === "challenge-result" && (
                      <div className="flex justify-start">
                        <div className={`max-w-[90%] p-4 rounded-sm border-2 ${
                          msg.result.outcome === "success" ? "border-green-500/50 bg-green-500/10" :
                          msg.result.outcome === "tie" ? "border-yellow-500/50 bg-yellow-500/10" :
                          "border-red-500/50 bg-red-500/10"
                        }`}>
                          <p className={`font-gothic text-xl mb-2 ${
                            msg.result.outcome === "success" ? "text-green-400" :
                            msg.result.outcome === "tie" ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {msg.result.outcome === "success"
                              ? (settings.challenge_success || "Successo!")
                              : msg.result.outcome === "tie"
                                ? (settings.challenge_tie || "Parità")
                                : (settings.challenge_failure || "Fallimento")}
                          </p>
                          <p className="font-body text-parchment text-sm mb-2">
                            {msg.result.attribute}
                          </p>
                          <p className="font-body text-muted-foreground text-sm mb-3">
                            ({msg.result.player_value}×{msg.result.player_roll}) {msg.result.player_result} vs ({msg.result.difficulty}×{msg.result.difficulty_roll}) {msg.result.difficulty_result}
                          </p>
                          <p className="font-body text-parchment leading-relaxed">
                            {msg.result.message.split(": ").slice(1).join(": ")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Risultato aiuto */}
                    {msg.type === "aid-result" && (
                      <div className="flex justify-start">
                        <div className="max-w-[90%] p-4 rounded-sm border-2 border-gold/50 bg-gold/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-gold" />
                            <p className="font-gothic text-xl text-gold">
                              {settings.aids_obtained || "Focalizzazione Ottenuta"}
                            </p>
                          </div>
                          <p className="font-body text-parchment text-sm mb-2">
                            {msg.result.attribute} - {msg.result.level_name}
                          </p>
                          <p className="font-body text-parchment leading-relaxed">
                            {msg.result.text}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start fade-in">
                    <div className="chat-message-ai text-parchment p-4 rounded-sm">
                      <p className="font-cinzel text-xs mb-2 opacity-70 uppercase tracking-wide">
                        {settings.oracle_name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        <span className="font-body text-muted-foreground">
                          {settings.chat_loading_message || "Consulto gli antichi tomi..."}
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
                placeholder={settings.chat_placeholder}
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
                {settings.actions_exhausted || "Hai esaurito le tue azioni disponibili"}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Challenge Modal */}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          token={token}
          onClose={handleCloseChallenge}
          onResult={handleChallengeResult}
        />
      )}

      {/* Aids Modal */}
      {showAidsModal && (
        <AidsModal
          token={token}
          onClose={() => setShowAidsModal(false)}
          onResult={handleAidResult}
          refreshUser={refreshUser}
        />
      )}
    </div>
  );
}
