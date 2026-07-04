import { useState } from "react";
import { Star, Trash2, FileText, ZoomIn } from "lucide-react";
import type { Photo } from "../../types";
import { getPhotoUrl, deletePhoto, updatePhoto } from "../../api/photos";

interface PhotoCardProps {
  photo: Photo;
  onDelete?: (id: string) => void;
  onView?: (photo: Photo) => void;
  readonly?: boolean;
}

const categoryLabels: Record<string, string> = {
  intake: "Intake",
  damage: "Damage",
  diagnostic: "Diagnostic",
  repair_progress: "Repair Progress",
  parts_replacement: "Parts Replacement",
  completed: "Completed",
  warranty: "Warranty",
  general: "General",
};

const categoryColors: Record<string, string> = {
  intake: "bg-copper-100 text-copper-800",
  damage: "bg-rust-100 text-rust-800",
  diagnostic: "bg-amber-100 text-amber-800",
  repair_progress: "bg-purple-100 text-purple-800",
  parts_replacement: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  warranty: "bg-teal-100 text-teal-800",
  general: "bg-warm-100 text-warm-800",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotoCard({ photo, onDelete, onView, readonly = false }: PhotoCardProps) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const thumbUrl = getPhotoUrl(photo, "thumbnail");

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this photo?")) return;
    setDeleting(true);
    try {
      await deletePhoto(photo.id);
      onDelete?.(photo.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleImportant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updatePhoto(photo.id, { is_important: !photo.is_important });
  };

  return (
    <div
      className="group relative bg-white rounded-lg border border-warm-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView?.(photo)}
    >
      {/* Image */}
      <div className="aspect-square bg-warm-100 relative overflow-hidden">
        {!imgError && thumbUrl ? (
          <img
            src={thumbUrl}
            alt={photo.original_filename}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-500">
            <FileText size={32} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="text-warm-900" size={28} />
        </div>

        {/* Important star */}
        {photo.is_important && (
          <Star className="absolute top-2 left-2 text-yellow-500 fill-yellow-500" size={18} />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${categoryColors[photo.category] || categoryColors.general}`}>
          {categoryLabels[photo.category] || photo.category}
        </span>
        <p className="text-xs text-warm-400 mt-1 truncate" title={photo.original_filename}>
          {photo.original_filename}
        </p>
        <p className="text-xs text-warm-500">
          {formatFileSize(photo.file_size)}
          {photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ""}
        </p>
        {photo.notes && (
          <p className="text-xs text-warm-400 mt-0.5 truncate" title={photo.notes}>
            {photo.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!readonly && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleImportant}
            className={`p-1 rounded ${photo.is_important ? "text-yellow-500" : "text-warm-900/80 hover:text-warm-900"}`}
            title={photo.is_important ? "Unmark important" : "Mark important"}
          >
            <Star size={16} className={photo.is_important ? "fill-current" : ""} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded text-warm-900/80 hover:text-red-300"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

