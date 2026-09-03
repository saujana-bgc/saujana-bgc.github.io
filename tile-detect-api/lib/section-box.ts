// Shared section-box geometry: the guided capture sends normalized boxes
// (0..1 fractions of the frame); cropping and prediction filtering need them
// in pixels, clamped to the image with a small safety pad.

export type SectionBox = { x: number; y: number; w: number; h: number };

// Safety margin so a tile sitting right on a box edge stays inside the crop
// (sections.ts uses the same padding for its coordinate bucketing).
export const BOX_PAD = 0.02;

export interface PixelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Convert a normalized section box into a pixel `extract` region, clamped to
 * the image and padded by BOX_PAD on every side. Returns null when the box
 * collapses to nothing (bad input or zero size after clamping).
 */
export function pixelBoxFor(
  box: SectionBox,
  imgWidth: number,
  imgHeight: number,
  padFraction: number = BOX_PAD,
): PixelBox | null {
  if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.w) || !Number.isFinite(box.h)) {
    return null;
  }
  if (imgWidth <= 0 || imgHeight <= 0 || box.w <= 0 || box.h <= 0) return null;

  const x1 = Math.max(0, Math.min(imgWidth, (box.x - padFraction) * imgWidth));
  const y1 = Math.max(0, Math.min(imgHeight, (box.y - padFraction) * imgHeight));
  const x2 = Math.max(0, Math.min(imgWidth, (box.x + box.w + padFraction) * imgWidth));
  const y2 = Math.max(0, Math.min(imgHeight, (box.y + box.h + padFraction) * imgHeight));

  const left = Math.round(x1);
  const top = Math.round(y1);
  const width = Math.round(x2) - left;
  const height = Math.round(y2) - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

/** True when a pixel point falls inside the normalized box (padded like pixelBoxFor). */
export function pointInBox(
  x: number,
  y: number,
  box: SectionBox,
  imgWidth: number,
  imgHeight: number,
  padFraction: number = BOX_PAD,
): boolean {
  const x1 = (box.x - padFraction) * imgWidth;
  const y1 = (box.y - padFraction) * imgHeight;
  const x2 = (box.x + box.w + padFraction) * imgWidth;
  const y2 = (box.y + box.h + padFraction) * imgHeight;
  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
}