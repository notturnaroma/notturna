import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Scroll } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";


const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Register({ onLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Errore", { description: "Le password non corrispondono" });
      return;
    }

    if (password.length < 6) {
      toast.error("Errore", { description: "La password deve avere almeno 6 caratteri" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Registrazione completata!", {
          description: `Benvenuto nell'Archivio, ${data.user.username}`
        });
        onLogin(data.access_token, data.user);
        navigate("/dashboard");
      } else {
        toast.error("Errore", { description: data.detail || "Registrazione fallita" });
      }
    } catch (error) {
      toast.error("Errore di connessione", { description: "Impossibile contattare il server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void stone-texture flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 fade-in">
          <Link to="/">
            <Scroll className="w-16 h-16 text-gold mx-auto mb-4" />
            <h1 className="font-gothic text-3xl text-gold">L'Archivio Maledetto</h1>
          </Link>
        </div>

        {/* Form Card */}
        <div className="form-gothic rounded-sm p-8 fade-in" data-testid="register-form">
          <h2 className="font-cinzel text-2xl text-parchment text-center mb-8 uppercase tracking-widest">
            Registrati
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-cinzel text-gold uppercase tracking-wide text-sm">
                Nome Utente
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Il tuo nome"
                required
                className="input-gothic rounded-sm h-12"
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-cinzel text-gold uppercase tracking-wide text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la.tua@email.com"
                required
                className="input-gothic rounded-sm h-12"
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-cinzel text-gold uppercase tracking-wide text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-gothic rounded-sm h-12 pr-12"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-cinzel text-gold uppercase tracking-wide text-sm">
                Conferma Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-gothic rounded-sm h-12"
                data-testid="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-cinzel text-lg h-12 bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic mt-6"
              data-testid="register-submit-btn"
            >
              {loading ? "REGISTRAZIONE..." : "UNISCITI ALL'ARCHIVIO"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground font-body">
              Hai già un account?{" "}
              <Link to="/login" className="text-gold hover:text-gold/80 font-cinzel transition-colors">
                Accedi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
