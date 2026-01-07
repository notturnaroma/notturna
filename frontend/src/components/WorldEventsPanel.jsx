import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MapPin, Package, User, Calendar, Search, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorldEventsPanel({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/world-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setEvents(await response.json());
      } else {
        toast.error("Errore nel caricamento degli eventi");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventIcon = (type) => {
    switch (type) {
      case "object_taken":
        return <Package className="w-4 h-4 text-yellow-400" />;
      case "location_visited":
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case "object_placed":
        return <Package className="w-4 h-4 text-green-400" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case "object_taken":
        return "Oggetto Preso";
      case "location_visited":
        return "Luogo Visitato";
      case "object_placed":
        return "Oggetto Posizionato";
      default:
        return type;
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Filtra eventi
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.object_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || event.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">
          Log Eventi del Mondo ({filteredEvents.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
          className="text-gold hover:bg-gold/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca per PG, luogo o oggetto..."
            className="input-gothic rounded-sm pl-10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-gothic rounded-sm px-3 py-2"
        >
          <option value="all">Tutti gli eventi</option>
          <option value="object_taken">Oggetti Presi</option>
          <option value="location_visited">Luoghi Visitati</option>
          <option value="object_placed">Oggetti Posizionati</option>
        </select>
      </div>

      {/* Lista eventi */}
      <ScrollArea className="h-[500px] pr-2">
        {loading ? (
          <div className="text-center py-8">
            <p className="font-body text-muted-foreground">Caricamento eventi...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-body text-muted-foreground">
              {searchTerm || filterType !== "all" 
                ? "Nessun evento corrisponde ai filtri" 
                : "Nessun evento registrato nel mondo di gioco"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-black/40 border border-border/40 rounded-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-cinzel text-gold text-sm">
                        {event.user_name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground font-body">
                        {getEventLabel(event.type)}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-parchment">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="font-body">{event.location}</span>
                      </div>
                      {event.object_name && (
                        <div className="flex items-center gap-2 text-sm text-parchment">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          <span className="font-body">{event.object_name}</span>
                        </div>
                      )}
                      {event.description && (
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(event.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
