import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '../components/ui/accordion';

export const FAQ = () => {
  const { t } = useLanguage();

  return (
    <section
      id="faq"
      data-testid="faq-section"
      className="py-24 md:py-32 bg-midnight relative"
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-heading text-4xl md:text-6xl text-white text-glow mb-4"
            data-testid="faq-heading"
          >
            {t.faq.heading}
          </h2>
          <p
            className="font-subheading text-sm md:text-base text-gold/80 uppercase tracking-[0.3em]"
            data-testid="faq-subheading"
          >
            {t.faq.subheading}
          </p>
          <div className="section-divider mt-8" />
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {t.faq.items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="faq-item border border-white/10 bg-obsidian/30 px-6 rounded-sm overflow-hidden"
              data-testid={`faq-item-${index}`}
            >
              <AccordionTrigger
                className="font-subheading text-base md:text-lg text-white/90 hover:text-gold py-6 text-left tracking-wide [&[data-state=open]]:text-gold"
                data-testid={`faq-question-${index}`}
              >
                {item.q}
              </AccordionTrigger>
              <AccordionContent
                className="font-body text-white/60 pb-6 leading-relaxed"
                data-testid={`faq-answer-${index}`}
              >
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
