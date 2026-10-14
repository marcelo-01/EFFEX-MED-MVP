export const MAX_PHOTO_INPUT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Escolha uma imagem JPG, PNG ou WebP.';
  if (file.size > MAX_PHOTO_INPUT_BYTES) return 'A imagem deve ter no máximo 10 MB.';
  return null;
}

/**
 * Recorta a imagem no centro em formato quadrado e reduz para `size` px (JPEG).
 * Assim a foto enviada fica leve (dezenas de KB) independentemente da câmera do celular.
 */
export async function toSquareJpeg(file: File, size = 320): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      element.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem.');
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
        'image/jpeg',
        0.85,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
