import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Scroll, 
  Calendar,
  MessageSquare,
  Loader2,
  BookOpen,
  Swords,
  Sparkles
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Archive({ user, token, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        toast.error("Errore", { description: "Impossibile caricare l'archivio" });
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-void stone-texture flex flex-col">
      {/* Navigation */}
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gold hover:bg-gold/10"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-cinzel">INDIETRO</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-gold" />
              <h1 className="font-gothic text-xl md:text-2xl text-gold">
                Archivio
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6 h-full">
          {/* History List */}
          <div className="lg:col-span-1">
            <div className="card-gothic rounded-sm overflow-hidden h-full" data-testid="archive-list">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-cinzel text-gold uppercase tracking-widest text-sm">
                  Le Tue Consultazioni
                </h2>
              </div>
              
              <ScrollArea className="h-[calc(100vh-280px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Scroll className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-cinzel text-muted-foreground">
                      Nessuna consultazione
                    </p>
                    <p className="font-body text-muted-foreground/70 text-sm mt-2">
                      Le tue domande appariranno qui
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedChat(item)}
                        className={`w-full text-left p-4 hover:bg-gold/5 transition-colors ${
                          selectedChat?.id === item.id ? "bg-gold/10 border-l-2 border-gold" : ""
                        }`}
                        data-testid={`archive-item-${item.id}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {item.type === "challenge" ? (
                            <Swords className="w-4 h-4 text-gold flex-shrink-0" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <p className="font-body text-parchment line-clamp-2">
                            {item.question}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Calendar className="w-3 h-3" />
                          <span className="font-body">{formatDate(item.created_at)}</span>
                          {item.type === "challenge" && item.challenge_data && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              item.challenge_data.outcome === "success" ? "bg-green-500/20 text-green-400" :
                              item.challenge_data.outcome === "tie" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {item.challenge_data.outcome === "success" ? "Successo" :
                               item.challenge_data.outcome === "tie" ? "Parità" : "Fallimento"}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Detail View */}
          <div className="lg:col-span-2">
            <div className="card-gothic rounded-sm h-full overflow-hidden" data-testid="archive-detail">
              {selectedChat ? (
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="p-6 space-y-6">
                    {/* Per le prove contrapposte */}
                    {selectedChat.type === "challenge" && selectedChat.challenge_data ? (
                      <>
                        {/* Header Prova */}
                        <div className="fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <Swords className="w-4 h-4 text-gold" />
                            <span className="font-cinzel text-gold uppercase tracking-widest text-xs">
                              Prova Contrapposta
                            </span>
                          </div>
                          <div className="bg-secondary/30 border border-gold/30 p-4 rounded-sm">
                            <h3 className="font-gothic text-xl text-gold mb-2">
                              {selectedChat.challenge_data.challenge_name}
                            </h3>
                            <p className="font-body text-muted-foreground mb-3">
                              {selectedChat.challenge_data.description}
                            </p>
                            <p className="font-cinzel text-sm text-parchment">
                              Attributo: {selectedChat.challenge_data.attribute}
                            </p>
                          </div>
                        </div>

                        {/* Risultato Tiro */}
                        <div className="fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-cinzel text-gold uppercase tracking-widest text-xs">
                              Risultato del Tiro
                            </span>
                          </div>
                          <div className="bg-black/30 p-4 rounded-sm text-center">
                            <div className="flex items-center justify-center gap-4 text-lg mb-4">
                              <div className="text-center">
                                <p className="font-gothic text-2xl text-gold">
                                  ({selectedChat.challenge_data.player_value}×{selectedChat.challenge_data.player_roll}) = {selectedChat.challenge_data.player_result}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Il tuo tiro</p>
                              </div>
                              <span className="font-gothic text-xl text-parchment">vs</span>
                              <div className="text-center">
                                <p className="font-gothic text-2xl text-primary">
                                  ({selectedChat.challenge_data.difficulty}×{selectedChat.challenge_data.difficulty_roll}) = {selectedChat.challenge_data.difficulty_result}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Difficoltà</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Esito */}
                        <div className="fade-in">
                          <div className={`p-4 rounded-sm border-2 ${
                            selectedChat.challenge_data.outcome === "success" ? "border-green-500/50 bg-green-500/10" :
                            selectedChat.challenge_data.outcome === "tie" ? "border-yellow-500/50 bg-yellow-500/10" :
                            "border-red-500/50 bg-red-500/10"
                          }`}>
                            <p className={`font-gothic text-2xl text-center mb-3 ${
                              selectedChat.challenge_data.outcome === "success" ? "text-green-400" :
                              selectedChat.challenge_data.outcome === "tie" ? "text-yellow-400" : "text-red-400"
                            }`}>
                              {selectedChat.challenge_data.outcome === "success" ? "Successo!" :
                               selectedChat.challenge_data.outcome === "tie" ? "Parità" : "Fallimento"}
                            </p>
                            <p className="font-body text-parchment leading-relaxed text-center">
                              {selectedChat.challenge_data.outcome_text}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Per le domande normali */}
                        {/* Question */}
                        <div className="fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-gold" />
                            <span className="font-cinzel text-gold uppercase tracking-widest text-xs">
                              La Tua Domanda
                            </span>
                          </div>
                          <div className="chat-message-user p-4 rounded-sm">
                            <p className="font-body text-gold leading-relaxed">
                              {selectedChat.question}
                            </p>
                          </div>
                        </div>

                        {/* Answer */}
                        <div className="fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <Scroll className="w-4 h-4 text-gold" />
                            <span className="font-cinzel text-gold uppercase tracking-widest text-xs">
                              Risposta dell'Oracolo
                            </span>
                          </div>
                          <div className="chat-message-ai p-4 rounded-sm">
                            <p className="font-body text-parchment leading-relaxed whitespace-pre-wrap">
                              {selectedChat.answer}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Timestamp */}
                    <div className="text-center pt-4 border-t border-border/30">
                      <p className="font-body text-muted-foreground text-sm">
                        Consultazione del {formatDate(selectedChat.created_at)}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <BookOpen className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="font-cinzel text-muted-foreground text-lg mb-2">
                    Seleziona una consultazione
                  </p>
                  <p className="font-body text-muted-foreground/70 text-sm max-w-md">
                    Clicca su una delle tue domande passate per visualizzare 
                    i dettagli della consultazione.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
