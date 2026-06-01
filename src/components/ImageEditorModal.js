"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getEditedImageFile } from "../utils/imageEditor";

const DEFAULT_PRESETS = [
  { label: "Free", value: null },
  { label: "Square", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:1", value: 3 / 1 }
];

const MIN_CROP_DISPLAY_SIZE = 44;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultCropBox(aspect, imageMeta, currentCrop) {
  if (!imageMeta.width || !imageMeta.height) return null;

  const imageAspect = imageMeta.width / imageMeta.height;
  const centerX = currentCrop ? currentCrop.x + currentCrop.width / 2 : 0.5;
  const centerY = currentCrop ? currentCrop.y + currentCrop.height / 2 : 0.5;
  let width = 0.88;
  let height = 0.88;

  if (aspect) {
    const normalizedRatio = aspect / imageAspect;
    if (normalizedRatio >= 1) {
      width = 0.88;
      height = width / normalizedRatio;
    } else {
      height = 0.88;
      width = height * normalizedRatio;
    }
  }

  width = clamp(width, 0.08, 1);
  height = clamp(height, 0.08, 1);

  return {
    x: clamp(centerX - width / 2, 0, 1 - width),
    y: clamp(centerY - height / 2, 0, 1 - height),
    width,
    height
  };
}

function resizeFreeCrop(startCrop, direction, dx, dy, minWidth, minHeight) {
  let left = startCrop.x;
  let top = startCrop.y;
  let right = startCrop.x + startCrop.width;
  let bottom = startCrop.y + startCrop.height;

  if (direction.includes("w")) left += dx;
  if (direction.includes("e")) right += dx;
  if (direction.includes("n")) top += dy;
  if (direction.includes("s")) bottom += dy;

  left = clamp(left, 0, right - minWidth);
  right = clamp(right, left + minWidth, 1);
  top = clamp(top, 0, bottom - minHeight);
  bottom = clamp(bottom, top + minHeight, 1);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function resizeAspectCrop(startCrop, direction, dx, dy, aspect, imageMeta, minWidth, minHeight) {
  const imageAspect = imageMeta.width / imageMeta.height;
  const normalizedRatio = aspect / imageAspect;
  const centerX = startCrop.x + startCrop.width / 2;
  const centerY = startCrop.y + startCrop.height / 2;
  const anchorX = direction.includes("w")
    ? startCrop.x + startCrop.width
    : direction.includes("e")
      ? startCrop.x
      : centerX;
  const anchorY = direction.includes("n")
    ? startCrop.y + startCrop.height
    : direction.includes("s")
      ? startCrop.y
      : centerY;

  let proposedWidth = startCrop.width;
  let proposedHeight = startCrop.height;

  if (direction.includes("w")) proposedWidth = startCrop.width - dx;
  if (direction.includes("e")) proposedWidth = startCrop.width + dx;
  if (direction.includes("n")) proposedHeight = startCrop.height - dy;
  if (direction.includes("s")) proposedHeight = startCrop.height + dy;

  const horizontalChange = Math.abs(proposedWidth - startCrop.width);
  const verticalChange = Math.abs(proposedHeight - startCrop.height);
  let width = horizontalChange >= verticalChange
    ? proposedWidth
    : proposedHeight * normalizedRatio;

  const maxWidthFromX = direction.includes("w")
    ? anchorX
    : direction.includes("e")
      ? 1 - anchorX
      : 2 * Math.min(centerX, 1 - centerX);
  const maxHeightFromY = direction.includes("n")
    ? anchorY
    : direction.includes("s")
      ? 1 - anchorY
      : 2 * Math.min(centerY, 1 - centerY);
  const maxWidth = Math.max(minWidth, Math.min(maxWidthFromX, maxHeightFromY * normalizedRatio, 1));
  const minAspectWidth = Math.max(minWidth, minHeight * normalizedRatio);

  width = clamp(width, minAspectWidth, maxWidth);
  const height = width / normalizedRatio;

  const x = direction.includes("w")
    ? anchorX - width
    : direction.includes("e")
      ? anchorX
      : centerX - width / 2;
  const y = direction.includes("n")
    ? anchorY - height
    : direction.includes("s")
      ? anchorY
      : centerY - height / 2;

  return {
    x: clamp(x, 0, 1 - width),
    y: clamp(y, 0, 1 - height),
    width,
    height
  };
}

export default function ImageEditorModal({
  isOpen,
  imageSrc,
  fileName,
  presets = DEFAULT_PRESETS,
  initialAspect = null,
  onClose,
  onSave
}) {
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const interactionRef = useRef(null);
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 });
  const [imageRect, setImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropBox, setCropBox] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [selectedAspect, setSelectedAspect] = useState(initialAspect);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const cropPixels = useMemo(() => {
    if (!cropBox || !imageMeta.width || !imageMeta.height) return null;
    return {
      x: Math.round(cropBox.x * imageMeta.width),
      y: Math.round(cropBox.y * imageMeta.height),
      width: Math.round(cropBox.width * imageMeta.width),
      height: Math.round(cropBox.height * imageMeta.height)
    };
  }, [cropBox, imageMeta]);

  const cropStyle = useMemo(() => {
    if (!cropBox || !imageRect.width || !imageRect.height) return null;
    return {
      left: imageRect.x + cropBox.x * imageRect.width,
      top: imageRect.y + cropBox.y * imageRect.height,
      width: cropBox.width * imageRect.width,
      height: cropBox.height * imageRect.height
    };
  }, [cropBox, imageRect]);

  const updateImageRect = useCallback(() => {
    if (!stageRef.current || !imageRef.current) return;
    const stageBounds = stageRef.current.getBoundingClientRect();
    const imageBounds = imageRef.current.getBoundingClientRect();
    setImageRect({
      x: imageBounds.left - stageBounds.left,
      y: imageBounds.top - stageBounds.top,
      width: imageBounds.width,
      height: imageBounds.height
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const loadedImage =
      imageRef.current &&
      imageRef.current.complete &&
      imageRef.current.naturalWidth > 0 &&
      imageRef.current.naturalHeight > 0;

    if (loadedImage) {
      const nextMeta = {
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      };
      setImageMeta(nextMeta);
      setCropBox((current) => getDefaultCropBox(initialAspect, nextMeta, current));
      requestAnimationFrame(updateImageRect);
    } else {
      setImageMeta({ width: 0, height: 0 });
      setImageRect({ x: 0, y: 0, width: 0, height: 0 });
      setCropBox(null);
    }
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setSelectedAspect(initialAspect);
    setSaveError("");
  }, [imageSrc, initialAspect, isOpen, updateImageRect]);

  useEffect(() => {
    if (!isOpen || !stageRef.current) return;
    updateImageRect();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateImageRect)
      : null;
    resizeObserver?.observe(stageRef.current);
    if (imageRef.current) resizeObserver?.observe(imageRef.current);
    window.addEventListener("resize", updateImageRect);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateImageRect);
    };
  }, [isOpen, updateImageRect]);

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const nextMeta = {
      width: imageRef.current.naturalWidth,
      height: imageRef.current.naturalHeight
    };
    setImageMeta(nextMeta);
    setCropBox((current) => getDefaultCropBox(selectedAspect, nextMeta, current));
    requestAnimationFrame(updateImageRect);
  };

  const startInteraction = (event, type, direction = null) => {
    if (!cropBox || !imageRect.width || !imageRect.height) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    interactionRef.current = {
      type,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      cropBox,
      imageRect,
      selectedAspect
    };
  };

  const handlePointerMove = useCallback((event) => {
    const interaction = interactionRef.current;
    if (!interaction) return;

    const dx = (event.clientX - interaction.startX) / interaction.imageRect.width;
    const dy = (event.clientY - interaction.startY) / interaction.imageRect.height;

    if (interaction.type === "move") {
      setCropBox({
        ...interaction.cropBox,
        x: clamp(interaction.cropBox.x + dx, 0, 1 - interaction.cropBox.width),
        y: clamp(interaction.cropBox.y + dy, 0, 1 - interaction.cropBox.height)
      });
      return;
    }

    const minWidth = Math.min(0.95, MIN_CROP_DISPLAY_SIZE / interaction.imageRect.width);
    const minHeight = Math.min(0.95, MIN_CROP_DISPLAY_SIZE / interaction.imageRect.height);
    setCropBox(
      interaction.selectedAspect
        ? resizeAspectCrop(
            interaction.cropBox,
            interaction.direction,
            dx,
            dy,
            interaction.selectedAspect,
            imageMeta,
            minWidth,
            minHeight
          )
        : resizeFreeCrop(interaction.cropBox, interaction.direction, dx, dy, minWidth, minHeight)
    );
  }, [imageMeta]);

  const endInteraction = useCallback(() => {
    interactionRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endInteraction);
      window.removeEventListener("pointercancel", endInteraction);
    };
  }, [endInteraction, handlePointerMove, isOpen]);

  const handleAspectChange = (aspect) => {
    setSaveError("");
    setSelectedAspect(aspect);
    setCropBox((current) => getDefaultCropBox(aspect, imageMeta, current));
  };

  const handleClose = (force = false) => {
    if (saving && !force) return;
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setCropBox(null);
    setSelectedAspect(initialAspect);
    setSaveError("");
    onClose?.();
  };

  const handleSave = async () => {
    if (!imageSrc) {
      setSaveError("Could not load image. Please re-upload and try again.");
      return;
    }
    const effectiveCropPixels = cropPixels || (
      imageMeta.width && imageMeta.height
        ? { x: 0, y: 0, width: imageMeta.width, height: imageMeta.height }
        : null
    );
    if (!effectiveCropPixels) {
      setSaveError("Image is still loading. Please wait a moment and tap Save again.");
      return;
    }

    setSaveError("");
    setSaving(true);
    try {
      const edited = await getEditedImageFile({
        imageSrc,
        cropPixels: effectiveCropPixels,
        rotation,
        flip,
        sourceName: fileName || "image"
      });
      await Promise.resolve(onSave?.(edited));
      handleClose(true);
    } catch (error) {
      console.error("Failed to edit image", error);
      setSaveError(error?.message || "Failed to save this photo. Please try again.");
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

        <div
          ref={stageRef}
          className="relative bg-[var(--gray-900)] aspect-[4/3] overflow-hidden touch-none select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            className="absolute inset-0 m-auto max-w-full max-h-full object-contain"
          />

          {cropStyle && (
            <>
              <div
                className="absolute bg-black/45 pointer-events-none"
                style={{ left: 0, top: 0, right: 0, height: cropStyle.top }}
              />
              <div
                className="absolute bg-black/45 pointer-events-none"
                style={{ left: 0, top: cropStyle.top, width: cropStyle.left, height: cropStyle.height }}
              />
              <div
                className="absolute bg-black/45 pointer-events-none"
                style={{
                  left: cropStyle.left + cropStyle.width,
                  top: cropStyle.top,
                  right: 0,
                  height: cropStyle.height
                }}
              />
              <div
                className="absolute bg-black/45 pointer-events-none"
                style={{ left: 0, top: cropStyle.top + cropStyle.height, right: 0, bottom: 0 }}
              />
              <div
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] cursor-move touch-none"
                style={cropStyle}
                onPointerDown={(event) => startInteraction(event, "move")}
              >
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/50 pointer-events-none" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/50 pointer-events-none" />
                <div className="absolute top-1/3 left-0 right-0 border-t border-white/50 pointer-events-none" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-white/50 pointer-events-none" />
                {["nw", "ne", "sw", "se"].map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-label={`Resize crop ${direction}`}
                    onPointerDown={(event) => startInteraction(event, "resize", direction)}
                    className={`absolute z-10 w-11 h-11 bg-transparent touch-none ${
                      direction === "nw"
                        ? "-left-5 -top-5 cursor-nwse-resize"
                        : direction === "ne"
                          ? "-right-5 -top-5 cursor-nesw-resize"
                          : direction === "sw"
                            ? "-left-5 -bottom-5 cursor-nesw-resize"
                            : "-right-5 -bottom-5 cursor-nwse-resize"
                    }`}
                  >
                    <span className="absolute left-1/2 top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-black/20 shadow-md pointer-events-none" />
                  </button>
                ))}
                {["n", "e", "s", "w"].map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-label={`Resize crop ${direction}`}
                    onPointerDown={(event) => startInteraction(event, "resize", direction)}
                    className={`absolute z-10 bg-transparent touch-none ${
                      direction === "n"
                        ? "left-1/2 -top-5 h-11 w-16 -translate-x-1/2 cursor-ns-resize"
                        : direction === "s"
                          ? "left-1/2 -bottom-5 h-11 w-16 -translate-x-1/2 cursor-ns-resize"
                          : direction === "e"
                            ? "-right-5 top-1/2 h-16 w-11 -translate-y-1/2 cursor-ew-resize"
                            : "-left-5 top-1/2 h-16 w-11 -translate-y-1/2 cursor-ew-resize"
                    }`}
                  >
                    <span className={`absolute rounded-full bg-white border border-black/20 shadow-md pointer-events-none ${
                      direction === "n" || direction === "s"
                        ? "left-1/2 top-1/2 h-3 w-8 -translate-x-1/2 -translate-y-1/2"
                        : "left-1/2 top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2"
                    }`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAspectChange(preset.value)}
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

          {saveError ? (
            <p className="text-sm text-[var(--error)]">{saveError}</p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="flex-1 btn btn-outlined">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !imageSrc}
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
