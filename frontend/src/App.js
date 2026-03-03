import React from 'react';
import "@/App.css";
import { LanguageProvider } from './context/LanguageContext';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { Story } from './components/Story';
import { Rules } from './components/Rules';
import { Gallery } from './components/Gallery';
import { Register } from './components/Register';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-obsidian" data-testid="nocturnum-app">
        {/* Noise Overlay */}
        <div className="noise-overlay" aria-hidden="true" />
        
        {/* Navigation */}
        <Navigation />
        
        {/* Main Content */}
        <main>
          <Hero />
          <Story />
          <Rules />
          <Gallery />
          <Register />
          <FAQ />
        </main>
        
        {/* Footer */}
        <Footer />
        
        {/* Toast Notifications */}
        <Toaster />
      </div>
    </LanguageProvider>
  );
}

export default App;
