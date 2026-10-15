const PNG_TYPE = 'image/png';
const ENCODE_ERROR = 'Could not encode the rendered image';

export function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error(ENCODE_ERROR));
      readAsDataUrl(blob).then(resolve, reject);
    }, PNG_TYPE);
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(ENCODE_ERROR)),
    );
    reader.addEventListener('error', () => reject(reader.error ?? new Error(ENCODE_ERROR)));
    reader.readAsDataURL(blob);
  });
}
