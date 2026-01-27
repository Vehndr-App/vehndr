const DEFAULT_OUTPUT_TYPE = "image/jpeg";
const DEFAULT_OUTPUT_QUALITY = 0.9;

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

function createImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

function getSourceDimensions(image, rotation) {
  const radians = getRadianAngle(rotation);
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = image.width * cos + image.height * sin;
  const height = image.width * sin + image.height * cos;
  return { width, height };
}

function applyTransforms(ctx, width, height, rotation, flip) {
  ctx.translate(width / 2, height / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-width / 2, -height / 2);
}

function toFileName(sourceName, outputType) {
  const extension = outputType === "image/png" ? "png" : "jpg";
  const base = sourceName ? sourceName.replace(/\.[^/.]+$/, "") : "edited";
  return `${base}.${extension}`;
}

export async function getEditedImageFile({
  imageSrc,
  cropPixels,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  outputType = DEFAULT_OUTPUT_TYPE,
  outputQuality = DEFAULT_OUTPUT_QUALITY,
  sourceName = "image"
}) {
  const image = await createImage(imageSrc);
  const { width: boundingWidth, height: boundingHeight } = getSourceDimensions(image, rotation);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(boundingWidth);
  canvas.height = Math.round(boundingHeight);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  applyTransforms(ctx, image.width, image.height, rotation, flip);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = Math.round(cropPixels.width);
  croppedCanvas.height = Math.round(cropPixels.height);
  const croppedCtx = croppedCanvas.getContext("2d");
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = "high";
  croppedCtx.drawImage(
    canvas,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise((resolve) => {
    croppedCanvas.toBlob(
      (result) => resolve(result),
      outputType,
      outputQuality
    );
  });

  if (!blob) {
    throw new Error("Failed to create image blob");
  }

  return new File([blob], toFileName(sourceName, outputType), {
    type: outputType,
    lastModified: Date.now()
  });
}
