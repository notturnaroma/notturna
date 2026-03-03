import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Menu, X } from 'lucide-react';

export const Navigation = () => {
  const { language, t, toggleLanguage } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#story', label: t.nav.story },
    { href: '#rules', label: t.nav.rules },
    { href: '#gallery', label: t.nav.gallery },
    { href: '#faq', label: t.nav.faq },
    { href: '#contact', label: t.nav.contact }
  ];

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      data-testid="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'glass-effect py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => scrollToSection(e, '#hero')}
          className="font-heading text-2xl md:text-3xl text-white hover:text-gold transition-colors duration-300"
          data-testid="nav-logo"
        >
          Nocturnum
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="nav-link font-subheading text-sm tracking-widest text-white/70 hover:text-gold transition-colors duration-300"
              data-testid={`nav-link-${link.href.replace('#', '')}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Language Toggle & Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <div className="lang-toggle" data-testid="language-toggle">
            <button
              onClick={() => toggleLanguage('it')}
              className={`lang-btn ${language === 'it' ? 'active' : ''}`}
              data-testid="lang-btn-it"
            >
              IT
            </button>
            <button
              onClick={() => toggleLanguage('en')}
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              data-testid="lang-btn-en"
            >
              EN
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 glass-effect transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        data-testid="mobile-menu"
      >
        <div className="px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="font-subheading text-sm uppercase tracking-widest text-white/70 hover:text-gold transition-colors duration-300 py-2"
              data-testid={`mobile-nav-link-${link.href.replace('#', '')}`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};
