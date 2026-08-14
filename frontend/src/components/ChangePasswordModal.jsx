import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, KeyRound, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChangePasswordModal({ token, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("La nuova password deve avere almeno 6 caratteri");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Le nuove password non coincidono");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        onClose();
      } else {
        toast.error(typeof data.detail === "string" ? data.detail : "Errore");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-gothic rounded-sm p-6 max-w-sm w-full" data-testid="change-password-modal">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-gold" />
            <h2 className="font-cinzel text-gold text-lg uppercase tracking-widest">Cambia Password</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-white" data-testid="close-password-modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Password Attuale</Label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="input-gothic rounded-sm"
              data-testid="old-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Nuova Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="input-gothic rounded-sm"
              data-testid="new-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-cinzel text-gold text-xs uppercase">Conferma Nuova Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="input-gothic rounded-sm"
              data-testid="confirm-password-input"
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm font-cinzel"
            data-testid="save-password-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
            AGGIORNA PASSWORD
          </Button>
        </form>
      </div>
    </div>
  );
}
