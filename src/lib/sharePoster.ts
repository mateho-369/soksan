// Phase 8 — branded share postcard. Renders the postcard to a canvas and
// returns a PNG data URL. Purely progressive enhancement: callers fall back
// to copy-link when canvas/image loading is unavailable (e.g. jsdom, CSP).
import type { Post } from '../types';

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed'));
    img.src = url;
  });
}

/** Draw the branded postcard; returns null when rendering is impossible. */
export async function drawSharePoster(
  post: Post,
  caption: string,
  authorName: string,
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = POSTER_WIDTH;
    canvas.height = POSTER_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Brand base: cream card with a sage header band.
    ctx.fillStyle = '#f9f6f0';
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

    let mediaHeight = 860;
    try {
      const img = await loadImage(post.media_url);
      const scale = Math.max(POSTER_WIDTH / img.width, mediaHeight / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (POSTER_WIDTH - w) / 2, 170 - 0, w, h);
      // Soft bottom wash so text stays readable.
      const wash = ctx.createLinearGradient(0, 170 + mediaHeight - 220, 0, 170 + mediaHeight);
      wash.addColorStop(0, 'rgba(12,18,14,0)');
      wash.addColorStop(1, 'rgba(12,18,14,0.45)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 170, POSTER_WIDTH, mediaHeight);
    } catch {
      // No media (offline/CDN blocked) — keep the sage placeholder block.
      ctx.fillStyle = '#e6efe6';
      ctx.fillRect(0, 170, POSTER_WIDTH, mediaHeight);
      mediaHeight = 860;
    }

    // Header band.
    ctx.fillStyle = '#5f7d6a';
    ctx.fillRect(0, 0, POSTER_WIDTH, 170);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 56px Manrope, sans-serif';
    ctx.fillText('SokSan Network', 56, 92);
    ctx.font = '500 34px Hanuman, sans-serif';
    ctx.fillStyle = '#dce9df';
    ctx.fillText('សុខសាន្ត · Discover Cambodia', 56, 138);

    // Location + caption.
    ctx.fillStyle = '#0c120e';
    ctx.font = '800 60px Manrope, sans-serif';
    ctx.fillText(post.location_name.slice(0, 34), 56, 170 + mediaHeight + 96);
    ctx.fillStyle = '#748078';
    ctx.font = '500 36px Manrope, sans-serif';
    const shortCaption = caption.length > 110 ? `${caption.slice(0, 110)}…` : caption;
    ctx.fillText(shortCaption, 56, 170 + mediaHeight + 156);

    // Author + deep link footer.
    ctx.fillStyle = '#5f7d6a';
    ctx.font = '700 34px Manrope, sans-serif';
    ctx.fillText(`${authorName} · ${post.province}`, 56, POSTER_HEIGHT - 96);
    ctx.fillStyle = '#e8543a';
    ctx.font = '800 34px Manrope, sans-serif';
    const link = `${window.location.origin}/post/${post.id}`;
    ctx.fillText(link, 56, POSTER_HEIGHT - 44);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
