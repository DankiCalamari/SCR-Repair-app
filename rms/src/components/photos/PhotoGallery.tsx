import { useState, useMemo } from "react";
import { Grid, List, Filter } from "lucide-react";
import type { Photo, PhotoCategory } from "../../types";
import PhotoCard from "./PhotoCard";
import PhotoLightbox from "./PhotoLightbox";

interface PhotoGalleryProps {
  photos: Photo[];
  onDeletePhoto?: (id: string) => void;
  readonly?: boolean;
  categoryCounts?: Record<PhotoCategory, number>;
}

const CATEGORY_FILTERS: { value: PhotoCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "intake", label: "Intake" },
  { value: "damage", label: "Damage" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "repair_progress", label: "Repair Progress" },
  { value: "parts_replacement", label: "Parts Replacement" },
  { value: "completed", label: "Completed" },
  { value: "warranty", label: "Warranty" },
  { value: "general", label: "General" },
];

type ViewMode = "grid" | "list";

export default function PhotoGallery({
  photos,
  onDeletePhoto,
  readonly = false,
  categoryCounts,
}: PhotoGalleryProps) {
  const [filter, setFilter] = useState<PhotoCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredPhotos = useMemo(() => {
    if (filter === "all") return photos;
    return photos.filter((p) => p.category === filter);
  }, [photos, filter]);

  const handleView = (photo: Photo) => {
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setLightboxIndex(idx);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-warm-500">
        <p className="text-sm">No photos yet.</p>
        {!readonly && (
          <p className="text-xs mt-1">Upload photos using the form above.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-warm-500" />
          <div className="flex gap-1 flex-wrap">
            {CATEGORY_FILTERS.map((cf) => {
              const count = cf.value === "all" ? photos.length : (categoryCounts?.[cf.value] ?? 0);
              return (
                <button
                  key={cf.value}
                  onClick={() => setFilter(cf.value)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    filter === cf.value
                      ? "bg-copper-500 text-white border-copper-500"
                      : "bg-white text-warm-400 border-warm-200 hover:border-warm-400"
                  }`}
                >
                  {cf.label}
                  {count !== undefined && (
                    <span className="ml-1 text-[10px] opacity-70">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-warm-200" : "hover:bg-warm-100"}`}
            title="Grid view"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-warm-200" : "hover:bg-warm-100"}`}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onDelete={onDeletePhoto}
              onView={handleView}
              readonly={readonly}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-warm-200 hover:shadow-sm cursor-pointer"
              onClick={() => handleView(photo)}
            >
              <div className="w-12 h-12 bg-warm-100 rounded overflow-hidden flex-shrink-0">
                {photo.thumbnail_path ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || ""}/uploads/${photo.thumbnail_path}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-600 text-xs">
                    📷
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-800 truncate">
                  {photo.original_filename}
                </p>
                <p className="text-xs text-warm-400">
                  {photo.category}
                  {photo.notes ? ` · ${photo.notes}` : ""}
                </p>
              </div>
              {!readonly && onDeletePhoto && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(photo.id);
                  }}
                  className="p-1 text-warm-500 hover:text-red-500"
                >
                  <span className="text-xs">Delete</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

