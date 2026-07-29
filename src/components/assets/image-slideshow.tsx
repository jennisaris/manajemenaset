'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type SlideshowItem = {
  name: string;
  url: string;
};

type ImageSlideshowProps = {
  items: SlideshowItem[];
  initialIndex?: number;
  onClose: () => void;
};

export function ImageSlideshow({ items, initialIndex = 0, onClose }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-[#F3F4F3] bg-white p-5 shadow-xs transition-all">
      {/* Header Bar */}
      <div className="mb-4 flex items-center justify-between border-b border-[#F3F4F3] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-[#165DFF]/10 px-3 py-1 text-xs font-bold text-[#165DFF]">
            Foto {currentIndex + 1} dari {items.length}
          </span>
          <h5 className="text-xs font-bold text-[#080C1A] truncate max-w-xs sm:max-w-md">
            {currentItem.name}
          </h5>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6A7686] hover:bg-[#F3F4F3] transition"
          title="Tutup Slideshow"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Slideshow Display Container */}
      <div className="relative flex h-[380px] sm:h-[460px] w-full items-center justify-center overflow-hidden rounded-[20px] bg-[#090D16] p-2">
        <img
          src={currentItem.url}
          alt={currentItem.name}
          className="h-full w-full object-contain transition duration-300"
        />

        {/* Navigation Buttons (only if >1 items) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-[#165DFF]"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-[#165DFF]"
              title="Foto Selanjutnya"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Bar */}
      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2.5 overflow-x-auto py-1">
          {items.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                index === currentIndex
                  ? 'border-[#165DFF] ring-2 ring-[#165DFF]/30'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
