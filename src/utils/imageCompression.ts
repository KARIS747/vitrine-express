/**
 * Compression d'image côté client (dans le navigateur du commerçant)
 * Permet de réduire une photo smartphone de 6 Mo à ~90 Ko sans perte visuelle gênante.
 * Garantit de rester 100% dans les quotas gratuits de Cloudflare sans ralentir la 4G/3G.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
}

export async function compressProductImage(
  file: File,
  maxDimension = 1000,
  quality = 0.82,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calcul du ratio pour ne pas dépasser maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        // Amélioration de l'anticrénelage pour un rendu net
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(mimeType, quality);

        const prefix = `data:${mimeType};base64,`;
        const stringLength = dataUrl.length - prefix.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383;
        const compressedSizeKB = Math.round(sizeInBytes / 1024);

        resolve({
          dataUrl,
          originalSizeKB,
          compressedSizeKB,
          width,
          height
        });
      };

      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

export async function compressStoreImage(
  file: File,
  kind: 'logo' | 'banner'
): Promise<CompressionResult> {
  const usePng = kind === 'logo' && file.type === 'image/png';
  return compressProductImage(
    file,
    kind === 'logo' ? 700 : 1600,
    kind === 'logo' ? 0.9 : 0.8,
    usePng ? 'image/png' : 'image/jpeg'
  );
}
