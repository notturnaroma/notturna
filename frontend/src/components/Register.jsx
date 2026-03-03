import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Scroll } from 'lucide-react';

export const Register = () => {
  const { t } = useLanguage();

  // Placeholder URL - will be replaced with actual Google Form link
  const googleFormUrl = 'https://docs.google.com/forms/';

  return (
    <section
      id="register"
      data-testid="register-section"
      className="py-24 md:py-32 cta-section relative"
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto flex items-center justify-center border border-gold/30 rounded-sm mb-8">
          <Scroll className="w-10 h-10 text-gold" />
        </div>

        {/* Heading */}
        <h2
          className="font-heading text-4xl md:text-6xl text-white text-glow mb-4"
          data-testid="register-heading"
        >
          {t.register.heading}
        </h2>

        {/* Subheading */}
        <p
          className="font-subheading text-sm md:text-base text-gold/80 tracking-[0.2em] mb-8"
          data-testid="register-subheading"
        >
          {t.register.subheading}
        </p>

        {/* Description */}
        <p
          className="font-body text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          data-testid="register-description"
        >
          {t.register.description}
        </p>

        {/* CTA Button */}
        <a
          href={googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-blood inline-block font-subheading text-sm md:text-base tracking-widest px-12 py-5 rounded-sm"
          data-testid="register-cta-button"
        >
          {t.register.button}
        </a>

        {/* Note */}
        <p
          className="font-body text-sm text-white/40 mt-8 max-w-lg mx-auto"
          data-testid="register-note"
        >
          {t.register.note}
        </p>
      </div>
    </section>
  );
};
