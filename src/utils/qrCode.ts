import { toDataURL } from 'qrcode';

export async function generateQRCodeDataUrl(
  text: string,
  size = 360,
  foreground = '#171E26',
  background = '#FFFFFF',
): Promise<string> {
  return toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: foreground,
      light: background,
    },
  });
}
