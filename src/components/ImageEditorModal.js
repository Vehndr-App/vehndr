"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { getEditedImageFile } from "../utils/imageEditor";

const DEFAULT_PRESETS = [
  { label: "Free", value: null },
  { label: "Square", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:1", value: 3 / 1 }
];

export default function ImageEditorModal({
  isOpen,
  imageSrc,
  fileName,
  presets = DEFAULT_PRESETS,
  initialAspect = null,
  onClose,
  onSave
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [cropPixels, setCropPixels] = useState(null);
  const [selectedAspect, setSelectedAspect] = useState(initialAspect);
  const [saving, setSaving] = useState(false);

  const activeAspect = useMemo(
    () => (selectedAspect === null ? undefined : selectedAspect),
    [selectedAspect]
  );

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCropPixels(croppedAreaPixels);
  }, []);

  const handleClose = () => {
    if (saving) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setCropPixels(null);
    setSelectedAspect(initialAspect);
    onClose?.();
  };

  const handleSave = async () => {
    if (!cropPixels || !imageSrc) return;
    setSaving(true);
    try {
      const edited = await getEditedImageFile({
        imageSrc,
        cropPixels,
        rotation,
        flip,
        sourceName: fileName || "image"
      });
      onSave?.(edited);
      handleClose();
    } catch (error) {
      console.error("Failed to edit image", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-[var(--radius-2xl)] bg-white overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--gray-100)]">
          <h3 className="text-base font-semibold text-[var(--gray-900)]">Edit Photo</h3>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--gray-100)] flex items-center justify-center hover:bg-[var(--gray-200)]"
          >
            <svg className="w-4 h-4 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative bg-[var(--gray-900)] aspect-[4/3]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={activeAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedAspect(preset.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedAspect === preset.value
                    ? "bg-[var(--violet-600)] text-white"
                    : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--gray-500)] uppercase tracking-wide">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--gray-500)] uppercase tracking-wide">Rotation</label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              className="btn btn-outlined text-sm"
            >
              Rotate Left
            </button>
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="btn btn-outlined text-sm"
            >
              Rotate Right
            </button>
            <button
              type="button"
              onClick={() => setFlip((prev) => ({ ...prev, horizontal: !prev.horizontal }))}
              className="btn btn-outlined text-sm"
            >
              Flip Horizontal
            </button>
            <button
              type="button"
              onClick={() => setFlip((prev) => ({ ...prev, vertical: !prev.vertical }))}
              className="btn btn-outlined text-sm"
            >
              Flip Vertical
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="flex-1 btn btn-outlined">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !cropPixels}
              className="flex-1 btn btn-gradient"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
