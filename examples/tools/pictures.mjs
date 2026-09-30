// Pictures as the example sites' tools read and write them, with
// Electron's own decoder and encoder (so the tools that use this run
// under Electron, as their first lines say): a picture's pixels, and a
// JPEG made from pixels.
import { nativeImage } from 'electron';

/** A picture's pixels: width, height, and 4 bytes a pixel (blue, green, red, alpha). */
export function decode(file) {
  const image = nativeImage.createFromPath(file);
  if (image.isEmpty()) throw new Error(`${file}: not a picture Electron can read`);
  const { width, height } = image.getSize();
  return { width, height, data: image.toBitmap() };
}

/** Pixels as a JPEG file's bytes, at a quality from 0 to 100. */
export function encode(picture, quality) {
  return nativeImage.createFromBitmap(picture.data, { width: picture.width, height: picture.height }).toJPEG(quality);
}
