import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown } from 'lucide-react';

export const Hero = () => {
  const { t } = useLanguage();

  const scrollToStory = () => {
    const element = document.querySelector('#story');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      data-testid="hero-section"
      className="hero-background min-h-screen flex flex-col items-center justify-center text-center relative"
      style={{
        backgroundImage: `url('https://customer-assets.emergentagent.com/job_nordic-vampire/artifacts/os3m4fyr_NOCTURNUM%20sfondo.png')`
      }}
    >
      {/* Content */}
      <div className="relative z-10 px-6 max-w-4xl mx-auto">
        {/* Main Title */}
        <h1
          className="font-heading text-6xl md:text-8xl lg:text-9xl text-white text-glow mb-4 opacity-0 animate-fade-in"
          data-testid="hero-title"
        >
          Nocturnum
        </h1>

        {/* Subtitle */}
        <h2
          className="font-subheading text-xl md:text-2xl lg:text-3xl text-gold tracking-[0.2em] mb-8 opacity-0 animate-fade-in delay-200"
          data-testid="hero-subtitle"
        >
          {t.hero.subtitle}
        </h2>

        {/* Description */}
        <p
          className="font-body text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed opacity-0 animate-fade-in delay-400"
          data-testid="hero-description"
        >
          {t.hero.description}
        </p>

        {/* CTA Button */}
        <a
          href="#register"
          className="btn-blood inline-block font-subheading text-sm md:text-base tracking-widest px-10 py-4 rounded-sm opacity-0 animate-fade-in delay-600"
          data-testid="hero-cta"
        >
          {t.hero.cta}
        </a>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToStory}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors duration-300 cursor-pointer opacity-0 animate-fade-in delay-700"
        data-testid="scroll-indicator"
        aria-label={t.hero.scroll}
      >
        <span className="font-subheading text-xs uppercase tracking-widest">
          {t.hero.scroll}
        </span>
        <ChevronDown size={24} className="animate-float" />
      </button>
    </section>
  );
};
