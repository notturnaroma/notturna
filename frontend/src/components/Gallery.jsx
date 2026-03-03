import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { galleryImages } from '../data/translations';
import { X, ZoomIn } from 'lucide-react';

export const Gallery = () => {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(null);

  const openLightbox = (image) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = '';
  };

  return (
    <section
      id="gallery"
      data-testid="gallery-section"
      className="py-24 md:py-32 bg-obsidian relative"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-heading text-4xl md:text-6xl text-white text-glow mb-4"
            data-testid="gallery-heading"
          >
            {t.gallery.heading}
          </h2>
          <p
            className="font-subheading text-sm md:text-base text-gold/80 tracking-[0.2em]"
            data-testid="gallery-subheading"
          >
            {t.gallery.subheading}
          </p>
          <div className="section-divider mt-8" />
        </div>

        {/* Gallery Grid */}
        {galleryImages.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="gallery-grid"
          >
            {galleryImages.map((image) => (
              <div
                key={image.id}
                className="gallery-image aspect-[4/3] rounded-sm cursor-pointer group"
                onClick={() => openLightbox(image)}
                data-testid={`gallery-image-${image.id}`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <div className="w-12 h-12 flex items-center justify-center bg-black/50 rounded-full">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-16 border border-white/10 rounded-sm"
            data-testid="gallery-empty"
          >
            <p className="font-body text-white/50 text-lg italic">
              {t.gallery.empty}
            </p>
          </div>
        )}

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
            data-testid="lightbox"
          >
            <button
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
              onClick={closeLightbox}
              data-testid="lightbox-close"
              aria-label="Close"
            >
              <X size={32} />
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
              data-testid="lightbox-image"
            />
          </div>
        )}
      </div>
    </section>
  );
};
