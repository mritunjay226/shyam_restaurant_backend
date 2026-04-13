"use client";

import { useState, useCallback } from "react";
import { UploadCloud, X, ImageIcon, Loader2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

// ── Single Image Uploader ───────────────────────────────────────────────────
interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
}

export function ImageUploader({ value, onChange, className, label }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary not configured", {
        description: "Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME & NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "shyam-hotel");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();

      if (!res.ok) {
        // Cloudinary returns error details in data.error.message
        throw new Error(data?.error?.message || `Upload failed (${res.status})`);
      }

      onChange(data.secure_url);
      toast.success("Image uploaded!");
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      toast.error("Upload failed", { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (value) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-gray-200 group bg-gray-50 h-32 flex items-center justify-center ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt={label ?? "Uploaded"} className="w-full h-full object-cover transition-opacity group-hover:opacity-70" />
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <label className="p-2 bg-white/90 text-gray-700 rounded-lg shadow-sm hover:bg-white cursor-pointer">
            <UploadCloud size={16} />
            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => onChange("")} className="p-2 bg-rose-500 text-white rounded-lg shadow-sm hover:bg-rose-600">
            <X size={16} />
          </button>
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors
        ${dragActive ? "border-green-500 bg-green-50/50" : "border-gray-200 bg-gray-50 hover:bg-gray-100/50 hover:border-gray-300"}
        ${isUploading ? "opacity-50 pointer-events-none" : ""} ${className ?? ""}`}
    >
      <div className="flex flex-col items-center justify-center py-4">
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-gray-400 mb-2 animate-spin" />
        ) : (
          <UploadCloud className="w-6 h-6 mb-2 text-gray-400" />
        )}
        <p className="mb-1 text-xs font-semibold text-gray-700">
          {isUploading ? "Uploading..." : "Click or drag to upload"}
        </p>
        <p className="text-[10px] text-gray-500">PNG, JPG, WEBP (max 10MB)</p>
      </div>
      <input
        type="file"
        className="hidden"
        accept="image/*"
        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
      />
    </label>
  );
}

// ── Gallery Image Uploader (multiple images) ────────────────────────────────
interface GalleryUploaderProps {
  value: string[];          // array of URLs
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function GalleryUploader({ value, onChange, maxImages = 8, className }: GalleryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (files: FileList) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary not configured");
      return;
    }

    const remaining = maxImages - value.length;
    const toUpload = Array.from(files).slice(0, remaining);

    if (!toUpload.length) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);

    try {
      const uploads = await Promise.all(
        toUpload.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds 10MB`);

          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", uploadPreset);
          formData.append("folder", "shyam-hotel");

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: formData }
          );
          const data = await res.json();

          if (!res.ok) throw new Error(data?.error?.message || `Upload failed (${res.status})`);
          return data.secure_url as string;
        })
      );

      onChange([...value, ...uploads]);
      toast.success(`${uploads.length} image${uploads.length > 1 ? "s" : ""} uploaded!`);
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    const arr = [...value];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {/* Gallery Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={url + i} className="relative group aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
              {/* Hero badge */}
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">Hero</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    className="p-1 bg-white/90 text-gray-700 rounded-md text-[10px] font-bold hover:bg-white"
                    title="Move left"
                  >
                    ←
                  </button>
                )}
                {i < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    className="p-1 bg-white/90 text-gray-700 rounded-md text-[10px] font-bold hover:bg-white"
                    title="Move right"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {value.length < maxImages && (
            <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors">
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              ) : (
                <>
                  <Plus size={18} className="text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-400 font-medium">Add More</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={e => { if (e.target.files) handleUpload(e.target.files); }}
              />
            </label>
          )}
        </div>
      )}

      {/* Empty state uploader */}
      {value.length === 0 && (
        <label className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
          border-gray-200 bg-gray-50 hover:bg-gray-100/50 hover:border-gray-300
          ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="flex flex-col items-center justify-center py-4">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-gray-400 mb-2 animate-spin" />
            ) : (
              <ImageIcon className="w-7 h-7 mb-2 text-gray-300" />
            )}
            <p className="mb-1 text-xs font-semibold text-gray-700">
              {isUploading ? "Uploading..." : "Upload gallery photos"}
            </p>
            <p className="text-[10px] text-gray-500">Up to {maxImages} images · PNG, JPG (max 10MB each)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={e => { if (e.target.files) handleUpload(e.target.files); }}
          />
        </label>
      )}

      <p className="text-[10px] text-gray-400">
        First image = Hero / main photo. Drag ← → arrows to reorder. {value.length}/{maxImages} images.
      </p>
    </div>
  );
}
