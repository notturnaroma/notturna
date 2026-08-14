import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ScrollText, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="font-cinzel text-gold text-xs uppercase tracking-widest border-b border-gold/30 pb-1 mb-2">{title}</h3>
    {children}
  </div>
);

export default function MySheetModal({ token, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const response = await fetch(`${API}/sheet/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setSheet(data.sheet);
        } else {
          setError(data.detail || "Errore");
        }
      } catch (e) {
        setError("Errore di connessione");
      } finally {
        setLoading(false);
      }
    };
    fetchSheet();
  }, [token]);

  const p = sheet?.personaggio || {};
  const attrs = [
    ["Forza", p.forza], ["Destrezza", p.destrezza], ["Attutimento", p.attutimento],
    ["Carisma", p.carisma], ["Persuasione", p.persuasione], ["Saggezza", p.saggezza],
    ["Prontezza", p.prontezza], ["Intelligenza", p.intelligenza]
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-2xl w-full max-h-[85vh] flex flex-col" data-testid="my-sheet-modal">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ScrollText className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">La Mia Scheda</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white" data-testid="close-sheet-modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
          ) : error ? (
            <p className="text-primary text-center py-8">{error}</p>
          ) : (
            <>
              <div className="text-center mb-5">
                <h3 className="font-gothic text-2xl text-parchment" data-testid="sheet-pg-name">{p.nomepg}</h3>
                <p className="font-cinzel text-gold text-sm uppercase tracking-wide">
                  {p.nomeclan} · {p.generazione}ª Generazione · {p.status}
                </p>
                <p className="font-body text-muted-foreground text-xs mt-1">
                  {p.nomelds && p.nomelds !== "" ? `${p.nomelds} · ` : ""}Sentiero: {p.sentiero} {p.valsentiero} · Rifugio: {p.rifugio} ({p.zona})
                </p>
              </div>

              <Section title="Attributi">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {attrs.map(([name, val]) => (
                    <div key={name} className="bg-black/40 border border-border/40 rounded-sm p-2 text-center">
                      <p className="font-cinzel text-[10px] text-muted-foreground uppercase">{name}</p>
                      <p className="font-gothic text-gold text-lg">{val || 0}</p>
                    </div>
                  ))}
                </div>
                <p className="font-body text-muted-foreground text-xs mt-2">
                  Forza di Volontà {p.fdv}/{p.fdvmax} · Punti Sangue {p.bloodp}
                </p>
              </Section>

              <Section title="Fama">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[["In Città", p.fama1], ["Tra i Vampiri", p.fama2], ["Mondo Oscuro", p.fama3]].map(([name, val]) => (
                    <div key={name} className="bg-black/40 border border-border/40 rounded-sm p-2 text-center">
                      <p className="font-cinzel text-[10px] text-muted-foreground uppercase">{name}</p>
                      <p className="font-gothic text-gold text-lg">{"●".repeat(parseInt(val) || 0) || "—"}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {(sheet.discipline || []).length > 0 && (
                <Section title="Discipline">
                  {sheet.discipline.map((d, i) => (
                    <div key={i} className="mb-2">
                      <p className="font-cinzel text-parchment text-sm">
                        {d.disciplina?.nomedisc} <span className="text-gold">{"●".repeat(parseInt(d.disciplina?.livello) || 0)}</span>
                      </p>
                      <p className="font-body text-muted-foreground text-xs">
                        {(d.poteri || []).map(pw => pw.nomepotere).join(" · ")}
                      </p>
                    </div>
                  ))}
                </Section>
              )}

              {(sheet.skill || []).some(s => parseInt(s.livello) > 0) && (
                <Section title="Conoscenze">
                  {sheet.skill.filter(s => parseInt(s.livello) > 0).map((s, i) => (
                    <div key={i} className="mb-2">
                      <p className="font-cinzel text-parchment text-sm">
                        {s.nomeskill} <span className="text-gold">{"●".repeat(parseInt(s.livello) || 0)}</span>
                      </p>
                      <p className="font-body text-muted-foreground text-xs">
                        {(s.subskill2 || []).filter(ss => parseInt(ss.livello) > 0).map(ss => `${(ss.nomeskill || "").trim()} ${ss.livello}`).join(" · ")}
                      </p>
                    </div>
                  ))}
                </Section>
              )}

              {(sheet.background || []).length > 0 && (
                <Section title="Background">
                  <p className="font-body text-parchment text-sm">
                    {sheet.background.filter(b => parseInt(b.livello) > 0).map(b => `${b.nomeback} ${b.livello}`).join(" · ")}
                  </p>
                </Section>
              )}

              {((sheet.contatti || []).length > 0 || (sheet.alleati || []).length > 0) && (
                <Section title="Contatti e Alleati">
                  <p className="font-body text-parchment text-sm">
                    {(sheet.contatti || []).map(c => `${c.nomecontatto} (Contatto ${c.livello})`).join(" · ")}
                    {(sheet.contatti || []).length > 0 && (sheet.alleati || []).length > 0 ? " · " : ""}
                    {(sheet.alleati || []).map(a => `${a.nomealleato} (Alleato ${a.livello})`).join(" · ")}
                  </p>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
