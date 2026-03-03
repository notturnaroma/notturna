import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Calendar, Users } from 'lucide-react';

export const Story = () => {
  const { t } = useLanguage();

  const infoCards = [
    {
      icon: MapPin,
      title: t.story.location.title,
      value: t.story.location.value
    },
    {
      icon: Calendar,
      title: t.story.date.title,
      value: t.story.date.value
    },
    {
      icon: Users,
      title: t.story.players.title,
      value: t.story.players.value
    }
  ];

  return (
    <section
      id="story"
      data-testid="story-section"
      className="py-24 md:py-32 bg-obsidian relative"
    >
      {/* Background Image Overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1769002047961-e225557c4959?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxnb3RoaWMlMjBjYXN0bGUlMjBuaWdodCUyMGZvZ3xlbnwwfHx8fDE3NzI1NzM4OTJ8MA&ixlib=rb-4.1.0&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-heading text-4xl md:text-6xl text-white text-glow mb-4"
            data-testid="story-heading"
          >
            {t.story.heading}
          </h2>
          <p
            className="font-subheading text-sm md:text-base text-gold/80 tracking-[0.2em]"
            data-testid="story-subheading"
          >
            {t.story.subheading}
          </p>
          <div className="section-divider mt-8" />
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <p
              className="font-body text-lg md:text-xl text-white/80 leading-relaxed"
              data-testid="story-p1"
            >
              {t.story.paragraph1}
            </p>
            <p
              className="font-body text-lg md:text-xl text-white/70 leading-relaxed"
              data-testid="story-p2"
            >
              {t.story.paragraph2}
            </p>
            <p
              className="font-body text-lg md:text-xl text-white/60 leading-relaxed italic"
              data-testid="story-p3"
            >
              {t.story.paragraph3}
            </p>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {infoCards.map((card, index) => (
              <div
                key={index}
                className="feature-card glass-effect p-6 flex items-center gap-6"
                data-testid={`info-card-${index}`}
              >
                <div className="w-14 h-14 flex items-center justify-center border border-gold/30 rounded-sm">
                  <card.icon className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-subheading text-xs uppercase tracking-widest text-white/50 mb-1">
                    {card.title}
                  </h4>
                  <p className="font-subheading text-xl text-white">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
