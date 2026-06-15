import jsQR from 'jsqr';

export function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  return code?.data ?? null;
}
