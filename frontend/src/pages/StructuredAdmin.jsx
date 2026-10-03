import { Link } from "react-router-dom";
import { ArrowLeft, Database } from "lucide-react";
import StructuredKnowledgePanel from "@/components/StructuredKnowledgePanel";

export default function StructuredAdmin({ user, token }) {
  return (
    <div className="min-h-screen bg-void stone-texture text-gray-200">
      <nav className="nav-gothic sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-gold hover:text-gold/80 flex items-center gap-2 text-sm font-cinzel">
              <ArrowLeft className="w-4 h-4"/> PANNELLO ADMIN
            </Link>
            <div className="h-5 w-px bg-border"/>
            <div className="flex items-center gap-2"><Database className="w-5 h-5 text-gold"/><span className="font-cinzel text-gold">ORACLE V2 · DATI STRUTTURATI</span></div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <StructuredKnowledgePanel token={token} user={user}/>
      </main>
    </div>
  );
}
