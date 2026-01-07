import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, BookOpen, Scroll } from "lucide-react";

// Lista delle discipline disponibili (da I Doni del Sangue)
const DISCIPLINE_LIST = [
  "Alchimia dei Sangue Debole",
  "Animalità",
  "Ascendente",
  "Auspex",
  "Chimerismo",
  "Cinetica",
  "Daimonion",
  "Demenza",
  "Dominazione",
  "Necromanzia",
  "Potenza",
  "Proteide",
  "Quietus",
  "Robustezza",
  "Serpentis",
  "Taumaturgia",
  "Taumaturgia Setita",
  "Tecnomanzia",
  "Velocità",
  "Vicissitudine"
];

// Vie Taumaturgiche (da I Doni del Sangue)
const VIE_TAUMATURGICHE = [
  "Via della Lusinga delle Fiamme",
  "Via del Patto della Vitae",
  "Via del Movimento della Mente",
  "Via della Corruzione",
  "Via del Sangue Maledetto",
  "Mani della Distruzione",
  "La Via della Duat"
];

// Vie Necromantiche (da I Doni del Sangue)
const VIE_NECROMANTICHE = [
  "Via dei Sepolcri",
  "Via delle Ceneri",
  "Via del Cenotafio",
  "Il Marciume della Tomba",
  "Via dei Quattro Umori"
];

const emptyDiscipline = { name: "", powers: [] };
const emptyPower = { name: "", level: 1 };
const emptyVia = { name: "", type: "taumaturgica", powers: [] };
const emptyRitual = { name: "", level: 1, type: "taumaturgico" };

export default function PowersSection({ background, setBackground, isLocked }) {
  const [expandedSections, setExpandedSections] = useState({
    disciplines: true,
    vie: false,
    rituals: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // === DISCIPLINE ===
  const addDiscipline = () => {
    setBackground(prev => ({
      ...prev,
      disciplines: [...(prev.disciplines || []), { ...emptyDiscipline }]
    }));
  };

  const removeDiscipline = (index) => {
    setBackground(prev => ({
      ...prev,
      disciplines: prev.disciplines.filter((_, i) => i !== index)
    }));
  };

  const updateDiscipline = (index, field, value) => {
    setBackground(prev => ({
      ...prev,
      disciplines: prev.disciplines.map((d, i) => 
        i === index ? { ...d, [field]: value } : d
      )
    }));
  };

  const addPowerToDiscipline = (discIndex) => {
    setBackground(prev => ({
      ...prev,
      disciplines: prev.disciplines.map((d, i) => 
        i === discIndex ? { ...d, powers: [...d.powers, { ...emptyPower }] } : d
      )
    }));
  };

  const removePowerFromDiscipline = (discIndex, powerIndex) => {
    setBackground(prev => ({
      ...prev,
      disciplines: prev.disciplines.map((d, i) => 
        i === discIndex ? { ...d, powers: d.powers.filter((_, pi) => pi !== powerIndex) } : d
      )
    }));
  };

  const updatePowerInDiscipline = (discIndex, powerIndex, field, value) => {
    setBackground(prev => ({
      ...prev,
      disciplines: prev.disciplines.map((d, i) => 
        i === discIndex ? {
          ...d,
          powers: d.powers.map((p, pi) => 
            pi === powerIndex ? { ...p, [field]: value } : p
          )
        } : d
      )
    }));
  };

  // === VIE ===
  const addVia = () => {
    setBackground(prev => ({
      ...prev,
      vie: [...(prev.vie || []), { ...emptyVia }]
    }));
  };

  const removeVia = (index) => {
    setBackground(prev => ({
      ...prev,
      vie: prev.vie.filter((_, i) => i !== index)
    }));
  };

  const updateVia = (index, field, value) => {
    setBackground(prev => ({
      ...prev,
      vie: prev.vie.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const addPowerToVia = (viaIndex) => {
    setBackground(prev => ({
      ...prev,
      vie: prev.vie.map((v, i) => 
        i === viaIndex ? { ...v, powers: [...v.powers, { ...emptyPower }] } : v
      )
    }));
  };

  const removePowerFromVia = (viaIndex, powerIndex) => {
    setBackground(prev => ({
      ...prev,
      vie: prev.vie.map((v, i) => 
        i === viaIndex ? { ...v, powers: v.powers.filter((_, pi) => pi !== powerIndex) } : v
      )
    }));
  };

  const updatePowerInVia = (viaIndex, powerIndex, field, value) => {
    setBackground(prev => ({
      ...prev,
      vie: prev.vie.map((v, i) => 
        i === viaIndex ? {
          ...v,
          powers: v.powers.map((p, pi) => 
            pi === powerIndex ? { ...p, [field]: value } : p
          )
        } : v
      )
    }));
  };

  // === RITUALI ===
  const addRitual = () => {
    setBackground(prev => ({
      ...prev,
      rituals: [...(prev.rituals || []), { ...emptyRitual }]
    }));
  };

  const removeRitual = (index) => {
    setBackground(prev => ({
      ...prev,
      rituals: prev.rituals.filter((_, i) => i !== index)
    }));
  };

  const updateRitual = (index, field, value) => {
    setBackground(prev => ({
      ...prev,
      rituals: prev.rituals.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  return (
    <div className="space-y-4 mt-6">
      {/* SEZIONE DISCIPLINE */}
      <div className="border border-gold/30 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('disciplines')}
          className="w-full p-3 bg-black/40 flex items-center justify-between hover:bg-black/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="font-cinzel text-gold text-sm uppercase tracking-widest">
              Discipline ({(background.disciplines || []).length})
            </span>
          </div>
          {expandedSections.disciplines ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
        </button>

        {expandedSections.disciplines && (
          <div className="p-4 space-y-4">
            {(background.disciplines || []).map((disc, discIndex) => (
              <div key={discIndex} className="p-3 bg-black/30 border border-border/40 rounded-sm space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={disc.name}
                    onChange={(e) => updateDiscipline(discIndex, 'name', e.target.value)}
                    className="flex-1 input-gothic rounded-sm text-sm"
                    disabled={isLocked}
                  >
                    <option value="">-- Seleziona Disciplina --</option>
                    {DISCIPLINE_LIST.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDiscipline(discIndex)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Poteri della disciplina */}
                <div className="pl-4 space-y-2">
                  <Label className="font-body text-muted-foreground text-xs">Poteri posseduti:</Label>
                  {disc.powers.map((power, powerIndex) => (
                    <div key={powerIndex} className="flex items-center gap-2">
                      <Input
                        value={power.name}
                        onChange={(e) => updatePowerInDiscipline(discIndex, powerIndex, 'name', e.target.value)}
                        placeholder="Nome potere"
                        className="flex-1 input-gothic rounded-sm text-sm h-8"
                        disabled={isLocked}
                      />
                      <select
                        value={power.level}
                        onChange={(e) => updatePowerInDiscipline(discIndex, powerIndex, 'level', parseInt(e.target.value))}
                        className="w-20 input-gothic rounded-sm text-sm h-8"
                        disabled={isLocked}
                      >
                        {[1,2,3,4,5].map(l => (
                          <option key={l} value={l}>Lv.{l}</option>
                        ))}
                      </select>
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePowerFromDiscipline(discIndex, powerIndex)}
                          className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPowerToDiscipline(discIndex)}
                      className="text-gold hover:text-gold/80 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Aggiungi potere
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDiscipline}
                className="w-full border-gold/30 text-gold hover:bg-gold/10"
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Disciplina
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SEZIONE VIE */}
      <div className="border border-gold/30 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('vie')}
          className="w-full p-3 bg-black/40 flex items-center justify-between hover:bg-black/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold" />
            <span className="font-cinzel text-gold text-sm uppercase tracking-widest">
              Vie Taumaturgiche/Necromantiche ({(background.vie || []).length})
            </span>
          </div>
          {expandedSections.vie ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
        </button>

        {expandedSections.vie && (
          <div className="p-4 space-y-4">
            {(background.vie || []).map((via, viaIndex) => (
              <div key={viaIndex} className="p-3 bg-black/30 border border-border/40 rounded-sm space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={via.type}
                    onChange={(e) => updateVia(viaIndex, 'type', e.target.value)}
                    className="w-36 input-gothic rounded-sm text-sm"
                    disabled={isLocked}
                  >
                    <option value="taumaturgica">Taumaturgica</option>
                    <option value="necromantica">Necromantica</option>
                  </select>
                  <select
                    value={via.name}
                    onChange={(e) => updateVia(viaIndex, 'name', e.target.value)}
                    className="flex-1 input-gothic rounded-sm text-sm"
                    disabled={isLocked}
                  >
                    <option value="">-- Seleziona Via --</option>
                    {(via.type === 'taumaturgica' ? VIE_TAUMATURGICHE : VIE_NECROMANTICHE).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVia(viaIndex)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Poteri della via */}
                <div className="pl-4 space-y-2">
                  <Label className="font-body text-muted-foreground text-xs">Poteri posseduti:</Label>
                  {via.powers.map((power, powerIndex) => (
                    <div key={powerIndex} className="flex items-center gap-2">
                      <Input
                        value={power.name}
                        onChange={(e) => updatePowerInVia(viaIndex, powerIndex, 'name', e.target.value)}
                        placeholder="Nome potere"
                        className="flex-1 input-gothic rounded-sm text-sm h-8"
                        disabled={isLocked}
                      />
                      <select
                        value={power.level}
                        onChange={(e) => updatePowerInVia(viaIndex, powerIndex, 'level', parseInt(e.target.value))}
                        className="w-20 input-gothic rounded-sm text-sm h-8"
                        disabled={isLocked}
                      >
                        {[1,2,3,4,5].map(l => (
                          <option key={l} value={l}>Lv.{l}</option>
                        ))}
                      </select>
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePowerFromVia(viaIndex, powerIndex)}
                          className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPowerToVia(viaIndex)}
                      className="text-gold hover:text-gold/80 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Aggiungi potere
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVia}
                className="w-full border-gold/30 text-gold hover:bg-gold/10"
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Via
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SEZIONE RITUALI */}
      <div className="border border-gold/30 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('rituals')}
          className="w-full p-3 bg-black/40 flex items-center justify-between hover:bg-black/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-gold" />
            <span className="font-cinzel text-gold text-sm uppercase tracking-widest">
              Rituali ({(background.rituals || []).length})
            </span>
          </div>
          {expandedSections.rituals ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
        </button>

        {expandedSections.rituals && (
          <div className="p-4 space-y-4">
            {(background.rituals || []).map((ritual, ritualIndex) => (
              <div key={ritualIndex} className="flex items-center gap-2 p-2 bg-black/30 border border-border/40 rounded-sm">
                <select
                  value={ritual.type}
                  onChange={(e) => updateRitual(ritualIndex, 'type', e.target.value)}
                  className="w-36 input-gothic rounded-sm text-sm"
                  disabled={isLocked}
                >
                  <option value="taumaturgico">Taumaturgico</option>
                  <option value="necromantico">Necromantico</option>
                </select>
                <Input
                  value={ritual.name}
                  onChange={(e) => updateRitual(ritualIndex, 'name', e.target.value)}
                  placeholder="Nome rituale"
                  className="flex-1 input-gothic rounded-sm text-sm h-8"
                  disabled={isLocked}
                />
                <select
                  value={ritual.level}
                  onChange={(e) => updateRitual(ritualIndex, 'level', parseInt(e.target.value))}
                  className="w-20 input-gothic rounded-sm text-sm h-8"
                  disabled={isLocked}
                >
                  {[1,2,3,4,5,6].map(l => (
                    <option key={l} value={l}>Lv.{l}</option>
                  ))}
                </select>
                {!isLocked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRitual(ritualIndex)}
                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}

            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRitual}
                className="w-full border-gold/30 text-gold hover:bg-gold/10"
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Rituale
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
