/**
 * Resize an image file using a Canvas and return a data URL (JPEG).
 *
 * The canvas context is checked before drawing so the function never
 * throws on environments where getContext("2d") is unavailable —
 * it falls back to the original file's object URL instead.
 */
export function resizeToDataUrl(
  file: File,
  maxPx = 512,
  quality = 0.88,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback: return a fresh object URL of the original file
        resolve(URL.createObjectURL(file));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen."));
    };

    img.src = objectUrl;
  });
}
