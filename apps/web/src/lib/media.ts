const DEFAULT_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? 'https://gateway.pinata.cloud';

/**
 * Converts stored asset URLs (ipfs://, blob:, https:) into a src usable in <img>.
 */
export function toDisplayImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('ipfs://')) {
    const hash = url.slice('ipfs://'.length);
    return `${DEFAULT_GATEWAY}/ipfs/${hash}`;
  }
  return url;
}
