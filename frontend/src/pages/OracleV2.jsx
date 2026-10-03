import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OracleV2({ user, token, refreshUser }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    const text = question.trim();
    if (!text || sending) return;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text }]);
    setSending(true);
    try {
      const res = await fetch(`${API}/oracle-v2/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Errore dell'Oracolo");
      setMessages((m) => [...m, { role: "oracle", text: data.answer }]);
      await refreshUser?.();
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: String(err.message || err) }]);
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-void text-gray-200">
      <header className="border-b border-red-950/70 bg-black/70 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-cinzel text-gold text-xl">L'ORACOLO</div>
            <div className="text-xs text-gray-500">DT Automatico · {user?.region || "Regione"}</div>
          </div>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gold">Torna alla Dashboard</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-5 rounded-lg border border-red-950/60 bg-black/40 p-4 text-sm text-gray-400">
          <strong className="text-gray-200">Scrivi richieste chiare e poco fraintendibili.</strong> Indica cosa fa il PG, cosa vuole ottenere e, quando conta, come intende farlo. Per le Discipline l'Oracolo usa sempre <em>I DONI DEL SANGUE</em>.
        </div>

        <div className="space-y-4 min-h-[48vh]">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 py-16">Descrivi la prima azione del tuo personaggio.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-lg p-4 whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "ml-8 bg-red-950/30 border border-red-950/50" : m.role === "error" ? "mr-8 bg-red-950/50 border border-red-800 text-red-200" : "mr-8 bg-zinc-900/80 border border-zinc-800"}`}>
              <div className="text-[11px] uppercase tracking-widest mb-2 text-gray-500">{m.role === "user" ? "Tu" : m.role === "oracle" ? "Oracolo" : "Sistema"}</div>
              {m.text}
            </div>
          ))}
          {sending && <div className="text-gray-500 animate-pulse">L'Oracolo consulta il canone…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="mt-6 sticky bottom-0 bg-void/95 py-4">
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} placeholder="Es.: Mi avvicino al custode con tono cordiale. Voglio sapere chi è entrato nell'edificio questa sera, senza rivelare perché lo sto cercando."
            className="w-full rounded-lg bg-black border border-zinc-800 focus:border-red-900 outline-none p-4 resize-none" />
          <div className="mt-2 flex justify-between items-center gap-3">
            <span className="text-xs text-gray-600">Azione + obiettivo + approccio</span>
            <button disabled={sending || !question.trim()} className="px-5 py-2 rounded bg-red-950 hover:bg-red-900 disabled:opacity-40 font-semibold">Invia all'Oracolo</button>
          </div>
        </form>
      </main>
    </div>
  );
}
