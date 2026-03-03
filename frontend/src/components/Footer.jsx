import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Facebook, Instagram, Mail, MessageCircle } from 'lucide-react';

export const Footer = () => {
  const { t } = useLanguage();

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: '#', // Placeholder - replace with actual link
      testId: 'social-facebook'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: '#', // Placeholder - replace with actual link
      testId: 'social-instagram'
    },
    {
      name: 'Discord',
      icon: MessageCircle,
      href: '#', // Placeholder - replace with actual link
      testId: 'social-discord'
    },
    {
      name: 'Email',
      icon: Mail,
      href: 'mailto:info@nocturnum.it', // Placeholder - replace with actual email
      testId: 'social-email'
    }
  ];

  return (
    <footer
      id="contact"
      data-testid="footer-section"
      className="py-16 md:py-24 bg-obsidian border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mb-12">
          {/* Brand Column */}
          <div className="text-center md:text-left">
            <h3
              className="font-heading text-3xl text-white mb-4"
              data-testid="footer-brand"
            >
              Nocturnum
            </h3>
            <p
              className="font-subheading text-xs uppercase tracking-widest text-white/50 mb-6"
              data-testid="footer-tagline"
            >
              {t.footer.tagline}
            </p>
            <p className="font-body text-sm text-white/40">
              {t.footer.organized} <span className="text-gold/70">Lucis</span>
            </p>
          </div>

          {/* Social Column */}
          <div className="text-center">
            <h4
              className="font-subheading text-xs uppercase tracking-widest text-white/50 mb-6"
              data-testid="footer-follow-title"
            >
              {t.footer.followUs}
            </h4>
            <div
              className="flex justify-center gap-4"
              data-testid="social-links"
            >
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  className="social-icon text-white/60 hover:text-gold"
                  data-testid={link.testId}
                  aria-label={link.name}
                >
                  <link.icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Contact Column */}
          <div className="text-center md:text-right">
            <h4
              className="font-subheading text-xs uppercase tracking-widest text-white/50 mb-6"
              data-testid="footer-contact-title"
            >
              {t.footer.contact}
            </h4>
            <a
              href="mailto:info@nocturnum.it"
              className="font-body text-white/60 hover:text-gold transition-colors duration-300"
              data-testid="footer-email"
            >
              info@nocturnum.it
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider mb-8" />

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <p
            className="font-body text-xs text-white/30"
            data-testid="footer-rights"
          >
            © {new Date().getFullYear()} Nocturnum. {t.footer.rights}
          </p>
          <p
            className="font-body text-xs text-white/20 max-w-lg"
            data-testid="footer-disclaimer"
          >
            {t.footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
};
