import { useCallback, useRef, useState } from "react";
import { Upload, ImagePlus, X, Loader2 } from "lucide-react";
import type { Photo, PhotoCategory } from "../../types";
import { uploadMultiplePhotos } from "../../api/photos";

interface PhotoUploaderProps {
  repairId?: string;
  deviceId?: string;
  customerId?: string;
  onUploaded?: (photos: Photo[]) => void;
  maxFiles?: number;
}

const CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: "intake", label: "Intake" },
  { value: "damage", label: "Damage" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "repair_progress", label: "Repair Progress" },
  { value: "parts_replacement", label: "Parts Replacement" },
  { value: "completed", label: "Completed" },
  { value: "warranty", label: "Warranty" },
  { value: "general", label: "General" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FilePreview {
  file: File;
  preview: string;
  error?: string;
}

export default function PhotoUploader({
  repairId,
  deviceId,
  customerId,
  onUploaded,
  maxFiles = 50,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [category, setCategory] = useState<PhotoCategory>("general");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | undefined => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid type. Use JPG, PNG, or WEBP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Max 10MB.";
    }
    return undefined;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles);
      const available = maxFiles - files.length;
      if (available <= 0) return;

      const toAdd = arr.slice(0, available).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        error: validateFile(file),
      }));
      setFiles((prev) => [...prev, ...toAdd]);
    },
    [files.length, maxFiles],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => !f.error);
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const photos = await uploadMultiplePhotos(
        validFiles.map((f) => f.file),
        {
          repairId: repairId || undefined,
          deviceId: deviceId || undefined,
          customerId: customerId || undefined,
          category,
          notes: notes || undefined,
          tags: tags || undefined,
        },
      );
      onUploaded?.(photos);
      // Cleanup previews
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setNotes("");
      setTags("");
    } finally {
      setUploading(false);
    }
  };

  const validCount = files.filter((f) => !f.error).length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-brand-500 bg-copper-50"
            : "border-rms-border hover:border-rms-border"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ImagePlus className="mx-auto text-rms-text0 mb-2" size={36} />
        <p className="text-sm text-rms-text-secondary mb-1">
          Drag & drop photos here, or{" "}
          <button
            type="button"
            className="text-brand-600 underline"
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="text-xs text-rms-text0">
          JPG, PNG, WEBP · Max 10MB per file · Up to {maxFiles} files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          capture="environment"
        />
      </div>

      {/* Options */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-rms-text-secondary mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PhotoCategory)}
              className="w-full border border-rms-border rounded-md px-2 py-1.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-rms-text-secondary mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for these photos"
              className="w-full border border-rms-border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-rms-text-secondary mb-1">
              Tags (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags"
              className="w-full border border-rms-border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {files.map((fp, i) => (
            <div
              key={i}
              className={`relative aspect-square rounded border overflow-hidden ${
                fp.error ? "border-red-300 bg-red-50" : "border-rms-border"
              }`}
            >
              {fp.error ? (
                <div className="w-full h-full flex items-center justify-center p-1">
                  <p className="text-xs text-red-600 text-center">{fp.error}</p>
                </div>
              ) : (
                <img
                  src={fp.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 text-rms-text rounded-full p-0.5 hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {validCount > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-md text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Uploading..." : `Upload ${validCount} photo${validCount > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

