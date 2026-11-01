export const MAX_PRODUCT_IMAGES = 20;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAXIMUM_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_REJECTED_MESSAGE = 'Use a JPG, PNG or WebP image up to 5 MB.';
export const TOO_MANY_IMAGES_MESSAGE = `A product can have at most ${MAX_PRODUCT_IMAGES} images.`;

/** The reason the API would refuse this file, or undefined when it is an acceptable product image. */
export function validateImageFile(file: File): string | undefined {
  const isAccepted = ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAXIMUM_IMAGE_BYTES;
  return isAccepted ? undefined : IMAGE_REJECTED_MESSAGE;
}
