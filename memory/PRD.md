# Nocturnum - Ashes to Ashes LARP Event Landing Page

## Original Problem Statement
Landing page dedicata alla presentazione di un nuovo ed esclusivo evento LARP, tratto dal celebre Vampire: Dark Age. Evento per massimo 200 giocatori, regolamento Nordic LARP, doppia lingua IT/EN.

## User Personas
1. **LARP Enthusiast** - Giocatori esperti di giochi di ruolo dal vivo interessati a eventi di qualità
2. **Vampire: The Masquerade Fan** - Fan del franchise World of Darkness che cercano esperienze immersive
3. **Nordic LARP Seeker** - Giocatori che preferiscono lo stile narrativo/immersivo del Nordic LARP
4. **First-time LARPer** - Nuovi giocatori attratti dall'atmosfera gotica e medievale

## Core Requirements (Static)
- [x] Hero section con immagine di copertina fornita dall'utente
- [x] Sezione Ambientazione/Storia con lore originale
- [x] Sezione Regolamento Nordic LARP
- [x] Galleria immagini con sistema facile per aggiungere foto
- [x] CTA per pre-registrazione (link a Google Form esterno)
- [x] FAQ con accordion
- [x] Footer con contatti e social (Facebook, Instagram, Discord, Email)
- [x] Doppia lingua IT/EN con toggle
- [x] Design gotico/medievale coerente con l'immagine fornita
- [x] Responsive design

## Architecture & Tech Stack
- **Frontend**: React.js con Tailwind CSS
- **Components**: Shadcn/UI (Accordion)
- **Icons**: Lucide React
- **Fonts**: UnifrakturMaguntia (heading), Cinzel (subheading), Crimson Pro (body)
- **Colors**: Deep blues/blacks, blood red (#7f1d1d), gold accents (#d4af37)
- **Backend**: FastAPI (minimal - no specific APIs needed for landing page)
- **Database**: MongoDB (available but not used for landing page)

## What's Been Implemented (v1.0 - December 2025)

### Components Created:
1. **Navigation.jsx** - Fixed navigation bar with glass effect, language toggle, mobile menu
2. **Hero.jsx** - Full-screen hero with cover image, animated title, CTA button
3. **Story.jsx** - Event lore section with info cards (location, date, max players)
4. **Rules.jsx** - Three Nordic LARP rule cards with icons
5. **Gallery.jsx** - Image grid with lightbox functionality
6. **Register.jsx** - CTA section linking to external Google Form
7. **FAQ.jsx** - Accordion with 6 frequently asked questions
8. **Footer.jsx** - Social links, contact info, disclaimer

### Features:
- Smooth scroll navigation
- IT/EN language toggle (full translations)
- Mobile-responsive design with hamburger menu
- Gallery with click-to-expand lightbox
- Dark gothic aesthetic with texture overlays
- Custom scrollbar styling
- Animated entrance effects

### Files Structure:
```
/app/frontend/src/
├── App.js
├── App.css
├── index.css
├── components/
│   ├── Navigation.jsx
│   ├── Hero.jsx
│   ├── Story.jsx
│   ├── Rules.jsx
│   ├── Gallery.jsx
│   ├── Register.jsx
│   ├── FAQ.jsx
│   └── Footer.jsx
├── context/
│   └── LanguageContext.js
└── data/
    └── translations.js (includes galleryImages array)
```

## Prioritized Backlog

### P0 (Critical for Launch)
- [ ] Replace Google Form placeholder with actual form URL
- [ ] Add actual social media links when available
- [ ] Update email from placeholder to real contact

### P1 (Important)
- [ ] Add event date when confirmed
- [ ] Add location details when selected
- [ ] Expand FAQ based on user questions
- [ ] Add more gallery images as events/photos become available

### P2 (Nice to Have)
- [ ] Add countdown timer when date is set
- [ ] Implement newsletter subscription
- [ ] Add clan selection preview section
- [ ] Create character creation guide section
- [ ] Add testimonials from previous events

## Next Tasks List
1. Provide actual Google Form URL for registration
2. Set up social media accounts and add real links
3. Finalize event location and date
4. Add more atmospheric images to gallery
5. Consider adding costume guidelines section
6. Consider adding a map/directions section once location is confirmed
