"use client";

import { useRef } from "react";
import SmartImage from "../SmartImage";
import { GalleryTopChrome } from "./GalleryChrome";
import { useScrollSnapIndex } from "./useScrollSnapIndex";

const HERO_HEIGHT = "min-h-[45vh] max-h-[480px] h-[45vh]";
const MOSAIC_HEIGHT = "h-[min(420px,50vh)] min-h-[320px]";

function GalleryImage({ src, alt, objectPosition, className }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
      fallbackClassName="bg-gradient-primary"
    />
  );
}

function ShowAllPhotosButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-[var(--gray-900)] shadow-md hover:bg-[var(--gray-50)] transition-colors ${className}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      Show all photos
    </button>
  );
}

function MobileCarousel({ images, heroObjectPosition, onImageClick, onShowAll, vendorId, onShare }) {
  const scrollRef = useRef(null);
  const { index } = useScrollSnapIndex(scrollRef, images.length);

  return (
    <div className={`relative md:hidden ${HERO_HEIGHT}`}>
      {images.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              className="relative flex-shrink-0 w-full h-full snap-center overflow-hidden bg-[var(--gray-100)]"
              onClick={() => onImageClick(i)}
            >
              <GalleryImage
                src={url}
                alt={`Photo ${i + 1}`}
                objectPosition={i === 0 ? heroObjectPosition : undefined}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="h-full bg-gradient-primary" />
      )}

      <GalleryTopChrome vendorId={vendorId} onShare={onShare} variant="dark" />

      {images.length > 1 && (
        <span className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs font-medium text-white">
          {index + 1} / {images.length}
        </span>
      )}

      {images.length > 1 && (
        <ShowAllPhotosButton onClick={onShowAll} className="absolute bottom-4 left-4 z-20" />
      )}
    </div>
  );
}

function MosaicTile({ url, index, heroObjectPosition, onClick, overlay }) {
  return (
    <button
      type="button"
      onClick={() => onClick(index)}
      className="relative w-full h-full overflow-hidden bg-[var(--gray-100)] group"
    >
      <GalleryImage
        src={url}
        alt={`Photo ${index + 1}`}
        objectPosition={index === 0 ? heroObjectPosition : undefined}
        className="absolute inset-0 w-full h-full object-cover group-hover:brightness-95 transition-all"
      />
      {overlay}
    </button>
  );
}

function DesktopMosaic({ images, heroObjectPosition, onImageClick, onShowAll, vendorId, onShare }) {
  const count = images.length;

  if (count === 0) {
    return (
      <div className={`relative hidden md:block mx-auto max-w-6xl px-4 sm:px-6 ${MOSAIC_HEIGHT}`}>
        <div className="h-full rounded-2xl bg-gradient-primary overflow-hidden">
          <GalleryTopChrome vendorId={vendorId} onShare={onShare} variant="dark" />
        </div>
      </div>
    );
  }

  const renderMosaicBody = () => {
    if (count === 1) {
      return (
        <div className="h-full rounded-2xl overflow-hidden">
          <MosaicTile url={images[0]} index={0} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 h-full rounded-2xl overflow-hidden">
          {images.map((url, i) => (
            <MosaicTile key={i} url={url} index={i} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-cols-[1.15fr_1fr] gap-2 h-full rounded-2xl overflow-hidden">
          <MosaicTile url={images[0]} index={0} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
          <div className="grid grid-rows-2 gap-2 min-h-0">
            <MosaicTile url={images[1]} index={1} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
            <MosaicTile url={images[2]} index={2} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-[1.15fr_1fr] gap-2 h-full rounded-2xl overflow-hidden">
          <MosaicTile url={images[0]} index={0} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
          <div className="grid grid-rows-3 gap-2 min-h-0">
            {[1, 2, 3].map((i) => (
              <MosaicTile
                key={i}
                url={images[i]}
                index={i}
                heroObjectPosition={heroObjectPosition}
                onClick={onImageClick}
              />
            ))}
          </div>
        </div>
      );
    }

    const extraCount = count > 5 ? count - 5 : 0;
    const rightSlots = [1, 2, 3, 4];

    return (
      <div className="grid grid-cols-[1.15fr_1fr] gap-2 h-full rounded-2xl overflow-hidden">
        <MosaicTile url={images[0]} index={0} heroObjectPosition={heroObjectPosition} onClick={onImageClick} />
        <div className="grid grid-cols-2 grid-rows-2 gap-2 min-h-0">
          {rightSlots.map((i) => {
            if (i >= count) return <div key={i} className="bg-[var(--gray-100)]" />;
            const showOverlay = extraCount > 0 && i === 4;

            return (
              <MosaicTile
                key={i}
                url={images[i]}
                index={i}
                heroObjectPosition={heroObjectPosition}
                onClick={showOverlay ? onShowAll : onImageClick}
                overlay={
                  showOverlay ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">+{extraCount}</span>
                    </div>
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative hidden md:block mx-auto max-w-6xl px-4 sm:px-6 ${MOSAIC_HEIGHT}`}>
      <div className="relative h-full">
        {renderMosaicBody()}
        <GalleryTopChrome vendorId={vendorId} onShare={onShare} variant="dark" />
        {count > 1 && (
          <ShowAllPhotosButton onClick={onShowAll} className="absolute bottom-4 right-4 z-20" />
        )}
      </div>
    </div>
  );
}

export default function StorefrontHeroGallery({
  images,
  heroObjectPosition,
  vendorId,
  onShare,
  onImageClick,
  onShowAll,
}) {
  return (
    <div className="relative w-full">
      <MobileCarousel
        images={images}
        heroObjectPosition={heroObjectPosition}
        onImageClick={onImageClick}
        onShowAll={onShowAll}
        vendorId={vendorId}
        onShare={onShare}
      />
      <DesktopMosaic
        images={images}
        heroObjectPosition={heroObjectPosition}
        onImageClick={onImageClick}
        onShowAll={onShowAll}
        vendorId={vendorId}
        onShare={onShare}
      />
    </div>
  );
}
