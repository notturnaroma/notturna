import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Eye, Sword, Shield, ArrowRight } from 'lucide-react';

const iconMap = {
  Eye: Eye,
  Sword: Sword,
  Shield: Shield
};

export const Rules = () => {
  const { t } = useLanguage();

  return (
    <section
      id="rules"
      data-testid="rules-section"
      className="py-24 md:py-32 bg-midnight relative overflow-hidden"
    >
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1467688695332-6b486449d78f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwzfHxtZWRpZXZhbCUyMHBhcmNobWVudCUyMHRleHR1cmUlMjBkYXJrfGVufDB8fHx8MTc3MjU3MzkwMnww&ixlib=rb-4.1.0&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-heading text-4xl md:text-6xl text-white text-glow mb-4"
            data-testid="rules-heading"
          >
            {t.rules.heading}
          </h2>
          <p
            className="font-subheading text-sm md:text-base text-gold/80 uppercase tracking-[0.3em]"
            data-testid="rules-subheading"
          >
            {t.rules.subheading}
          </p>
          <div className="section-divider mt-8" />
        </div>

        {/* Rules Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {t.rules.items.map((item, index) => {
            const IconComponent = iconMap[item.icon];
            return (
              <div
                key={index}
                className="feature-card group p-8 border border-white/5 bg-obsidian/50 hover:border-gold/20 transition-all duration-500"
                data-testid={`rule-card-${index}`}
              >
                {/* Icon */}
                <div className="w-16 h-16 flex items-center justify-center border border-gold/30 rounded-sm mb-6 group-hover:border-gold/60 transition-colors duration-300">
                  <IconComponent className="w-8 h-8 text-gold/70 group-hover:text-gold transition-colors duration-300" />
                </div>

                {/* Title */}
                <h3
                  className="font-subheading text-lg md:text-xl text-white mb-4 tracking-wide"
                  data-testid={`rule-title-${index}`}
                >
                  {item.title}
                </h3>

                {/* Description */}
                <p
                  className="font-body text-white/60 leading-relaxed"
                  data-testid={`rule-desc-${index}`}
                >
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Learn More Link */}
        <div className="text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 font-subheading text-sm uppercase tracking-widest text-gold/70 hover:text-gold transition-colors duration-300 group"
            data-testid="rules-learn-more"
          >
            {t.rules.learnMore}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
    </section>
  );
};
