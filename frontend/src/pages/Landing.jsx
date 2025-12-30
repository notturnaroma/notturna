import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scroll, Archive, Shield, Sparkles } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";


export default function Landing() {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-void stone-texture">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col">
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />
        
        {/* Navigation */}
        <nav className="nav-gothic sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="font-gothic text-2xl md:text-3xl text-gold">
              {settings.event_name}
            </h1>
            <div className="flex gap-4">
              <Link to="/login">
                <Button 
                  variant="outline" 
                  className="font-cinzel border-gold/50 text-gold hover:bg-gold/10 hover:border-gold rounded-sm"
                  data-testid="login-btn"
                >
                  ACCEDI
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  className="font-cinzel bg-primary hover:bg-primary/80 text-white rounded-sm btn-gothic"
                  data-testid="register-btn"
                >
                  REGISTRATI
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <main className="flex-1 flex items-center justify-center px-6 hero-gradient">
          <div className="max-w-4xl mx-auto text-center fade-in">
            <div className="mb-8">
              <Sparkles className="w-16 h-16 text-gold mx-auto mb-6 opacity-80" />
            </div>
            <h2 className="font-gothic text-5xl md:text-7xl lg:text-8xl text-parchment mb-6 leading-tight">
              {settings.hero_title}
            </h2>
            <p className="font-cinzel text-gold text-lg md:text-xl mb-4 tracking-widest uppercase">
              {settings.hero_subtitle}
            </p>
            <p className="font-body text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              {settings.hero_description}
            </p>
            
            <Link to="/register">
              <Button 
                size="lg"
                className="font-cinzel text-lg px-12 py-6 bg-primary hover:bg-primary/80 border-2 border-gold/50 rounded-sm btn-gothic glow-red"
                data-testid="cta-btn"
              >
                {settings.landing_cta}
              </Button>
            </Link>
          </div>
        </main>

        {/* Features Section */}
        <section className="py-20 px-6 bg-gradient-to-b from-transparent to-black/50">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-gothic text-3xl md:text-4xl text-center text-gold mb-16">
              Le Vie del Sapere
            </h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card-gothic p-8 text-center fade-in glow-gold" data-testid="feature-chat">
                <Scroll className="w-12 h-12 text-gold mx-auto mb-6" />
                <h4 className="font-cinzel text-xl text-parchment mb-4 uppercase tracking-wide">
                  {settings.landing_feature1_title}
                </h4>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {settings.landing_feature1_desc}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card-gothic p-8 text-center fade-in glow-gold" data-testid="feature-archive">
                <Archive className="w-12 h-12 text-gold mx-auto mb-6" />
                <h4 className="font-cinzel text-xl text-parchment mb-4 uppercase tracking-wide">
                  {settings.landing_feature2_title}
                </h4>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {settings.landing_feature2_desc}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card-gothic p-8 text-center fade-in glow-gold" data-testid="feature-actions">
                <Shield className="w-12 h-12 text-gold mx-auto mb-6" />
                <h4 className="font-cinzel text-xl text-parchment mb-4 uppercase tracking-wide">
                  {settings.landing_feature3_title}
                </h4>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {settings.landing_feature3_desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border/30">
          <div className="max-w-7xl mx-auto text-center">
            <p className="font-cinzel text-muted-foreground text-sm tracking-widest">
              L'ARCHIVIO MALEDETTO © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
