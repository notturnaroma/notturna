import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Scroll } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";


const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Accesso riuscito!", {
          description: `Benvenuto, ${data.user.username}`
        });
        onLogin(data.access_token, data.user);
        navigate("/dashboard");
      } else {
        toast.error("Errore", { description: data.detail || "Credenziali non valide" });
      }
    } catch (error) {
      toast.error("Errore di connessione", { description: "Impossibile contattare il server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void stone-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 fade-in">
          <Link to="/">
            <Scroll className="w-16 h-16 text-gold mx-auto mb-4" />
            <h1 className="font-gothic text-3xl text-gold">{settings.event_name}</h1>
          </Link>
        </div>

        {/* Form Card */}
        <div className="form-gothic rounded-sm p-8 fade-in" data-testid="login-form">
          <h2 className="font-cinzel text-2xl text-parchment text-center mb-8 uppercase tracking-widest">
            {settings.auth_login_title || "Accedi"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-cinzel text-lg h-12 bg-primary hover:bg-primary/80 border border-gold/30 rounded-sm btn-gothic"
              data-testid="login-submit-btn"
            >
              {loading ? "ACCESSO IN CORSO..." : (settings.auth_login_btn || "ENTRA NELL'ARCHIVIO")}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground font-body">
              Non hai un account?{" "}
              <Link to="/register" className="text-gold hover:text-gold/80 font-cinzel transition-colors">
                Registrati
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
