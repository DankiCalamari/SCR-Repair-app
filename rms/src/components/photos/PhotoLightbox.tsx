import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Photo } from "../../types";
import { getPhotoUrl, downloadPhoto } from "../../api/photos";

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const photo = photos[currentIndex];

  useEffect(() => {
    setZoom(1);
    setLoading(true);
  }, [currentIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, photos.length, onClose, onNavigate]);

  const handleDownload = async () => {
    try {
      const blob = await downloadPhoto(photo.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(getPhotoUrl(photo, "original"), "_blank");
    }
  };

  if (!photo) return null;

  const imageUrl = getPhotoUrl(photo, "original");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="text-warm-50 text-sm">
          <span className="font-medium">
            {currentIndex + 1} / {photos.length}
          </span>
          <span className="ml-3 text-warm-50/70 truncate max-w-xs inline-block align-bottom">
            {photo.original_filename}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="text-warm-50/80 hover:text-warm-50 p-1.5 rounded"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="text-warm-50/80 hover:text-warm-50 p-1.5 rounded"
            title="Close"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-50/70 hover:text-warm-50 bg-black/30 rounded-full p-2 z-10"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-50/70 hover:text-warm-50 bg-black/30 rounded-full p-2 z-10"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="absolute text-warm-50/50 text-sm">Loading...</div>
        )}
        <img
          src={imageUrl}
          alt={photo.original_filename}
          className="max-w-full max-h-[85vh] object-contain transition-transform"
          style={{ transform: `scale(${zoom})` }}
          onLoad={() => setLoading(false)}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.25, z - 0.25)); }}
          className="text-warm-50/80 hover:text-warm-50"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-warm-50/80 text-xs w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(5, z + 0.25)); }}
          className="text-warm-50/80 hover:text-warm-50"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(1); }}
          className="text-warm-50/80 hover:text-warm-50 ml-1"
          title="Reset zoom"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Photo info */}
      {photo.notes && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-warm-50/70 text-sm bg-black/50 rounded px-3 py-1 max-w-md text-center truncate z-10">
          {photo.notes}
        </div>
      )}
    </div>
  );
}

