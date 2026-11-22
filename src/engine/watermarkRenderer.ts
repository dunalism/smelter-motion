import type {
  PalettePreset,
  WatermarkPlatform,
  WatermarkPosition,
  WatermarkSettings,
} from '../types/studio';
import { clamp } from './motionMath';

export const WATERMARK_PLATFORMS: WatermarkPlatform[] = [
  'instagram',
  'youtube',
  'tiktok',
  'facebook',
];

export const WATERMARK_PLATFORM_META: Record<
  WatermarkPlatform,
  {
    id: WatermarkPlatform;
    label: string;
    brandColor: string;
  }
> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    brandColor: '#E1306C',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    brandColor: '#FF0000',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    brandColor: '#25F4EE',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    brandColor: '#1877F2',
  },
};

export const WATERMARK_POSITION_OPTIONS: Array<{
  id: WatermarkPosition;
  label: string;
  shortLabel: string;
}> = [
  { id: 'bottom-left', label: 'Pojok Kiri Bawah (Default)', shortLabel: 'Kiri Bawah' },
  { id: 'bottom-right', label: 'Pojok Kanan Bawah', shortLabel: 'Kanan Bawah' },
  { id: 'top-left', label: 'Pojok Kiri Atas', shortLabel: 'Kiri Atas' },
  { id: 'top-right', label: 'Pojok Kanan Atas', shortLabel: 'Kanan Atas' },
];

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: false,
  platforms: ['instagram'],
  position: 'bottom-left',
  opacity: 0.65,
  scale: 1,
  text: '',
};

export function normalizeWatermarkSettings(
  watermark?: Partial<WatermarkSettings> | null
): WatermarkSettings {
  const validPlatforms: WatermarkPlatform[] = [];
  const rawPlatforms = Array.isArray(watermark?.platforms)
    ? watermark.platforms
    : DEFAULT_WATERMARK_SETTINGS.platforms;

  for (const p of rawPlatforms) {
    if (
      (p === 'instagram' || p === 'youtube' || p === 'tiktok' || p === 'facebook') &&
      !validPlatforms.includes(p)
    ) {
      validPlatforms.push(p);
    }
  }

  const pos = watermark?.position;
  const position: WatermarkPosition =
    pos === 'bottom-left' ||
    pos === 'bottom-right' ||
    pos === 'top-left' ||
    pos === 'top-right'
      ? pos
      : 'bottom-left';

  const opacity = Number.isFinite(watermark?.opacity)
    ? clamp(Number(watermark?.opacity), 0.2, 0.95)
    : DEFAULT_WATERMARK_SETTINGS.opacity;

  const scale = Number.isFinite(watermark?.scale)
    ? clamp(Number(watermark?.scale), 0.7, 1.35)
    : DEFAULT_WATERMARK_SETTINGS.scale;

  const text =
    typeof watermark?.text === 'string'
      ? watermark.text.replace(/\s+/g, ' ').trim().slice(0, 28)
      : '';

  return {
    enabled: Boolean(watermark?.enabled),
    platforms: validPlatforms,
    position,
    opacity,
    scale,
    text,
  };
}

export interface WatermarkLayout {
  x: number;
  y: number;
  boxWidth: number;
  boxHeight: number;
  iconSize: number;
  gap: number;
  padX: number;
  padY: number;
  fontSize: number;
  textWidth: number;
  marginX: number;
  marginY: number;
}

export function computeWatermarkLayout(
  width: number,
  height: number,
  settings: WatermarkSettings,
  ctx?: CanvasRenderingContext2D
): WatermarkLayout {
  const minDim = Math.min(width, height);
  const iconSize = Math.round(clamp(minDim * 0.028 * settings.scale, 14, 34));
  const gap = Math.max(5, Math.round(iconSize * 0.34));
  const padX = Math.max(8, Math.round(iconSize * 0.48));
  const padY = Math.max(5, Math.round(iconSize * 0.32));
  const fontSize = Math.max(10, Math.round(iconSize * 0.62));

  const count = Math.max(1, settings.platforms.length);
  const logosWidth = count * iconSize + Math.max(0, count - 1) * gap;

  const trimmedText = (settings.text || '').trim();
  let textWidth = 0;
  if (trimmedText.length > 0) {
    if (ctx && typeof ctx.measureText === 'function') {
      ctx.save();
      ctx.font = `600 ${fontSize}px "DM Sans", sans-serif`;
      const measured = ctx.measureText(trimmedText).width;
      ctx.restore();
      textWidth = Math.min(Math.round(width * 0.24), Math.ceil(measured));
    } else {
      textWidth = Math.min(
        Math.round(width * 0.24),
        Math.ceil(trimmedText.length * fontSize * 0.58)
      );
    }
  }

  const textGap = textWidth > 0 ? Math.max(6, Math.round(iconSize * 0.38)) : 0;
  const boxWidth = padX * 2 + logosWidth + textGap + textWidth;
  const boxHeight = padY * 2 + iconSize;

  // Outer safe-zone margins so watermark never touches or blocks main animation/subtitles
  const marginX = Math.max(16, Math.round(width * 0.03));
  const marginY = Math.max(16, Math.round(height * 0.024));

  const isRight = settings.position === 'bottom-right' || settings.position === 'top-right';
  const isTop = settings.position === 'top-left' || settings.position === 'top-right';

  const x = isRight ? Math.max(marginX, width - marginX - boxWidth) : marginX;
  const y = isTop ? marginY : Math.max(marginY, height - marginY - boxHeight);

  return {
    x,
    y,
    boxWidth,
    boxHeight,
    iconSize,
    gap,
    padX,
    padY,
    fontSize,
    textWidth,
    marginX,
    marginY,
  };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawInstagramLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  const r = size * 0.24;
  if (typeof ctx.createLinearGradient === 'function') {
    const grad = ctx.createLinearGradient(x, y + size, x + size, y);
    grad.addColorStop(0, '#F58529');
    grad.addColorStop(0.5, '#DD2A7B');
    grad.addColorStop(1, '#515BD4');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = '#E1306C';
  }
  roundedRectPath(ctx, x, y, size, size, r);
  ctx.fill();

  const inset = size * 0.2;
  const innerSize = size - inset * 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.2, size * 0.085);
  roundedRectPath(ctx, x + inset, y + inset, innerSize, innerSize, size * 0.14);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.145, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + size * 0.68, y + size * 0.32, Math.max(1, size * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawYouTubeLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  const h = size * 0.72;
  const top = y + (size - h) / 2;
  ctx.fillStyle = '#FF0000';
  roundedRectPath(ctx, x, top, size, h, size * 0.2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  const cx = x + size * 0.52;
  const cy = y + size * 0.5;
  const triW = size * 0.28;
  const triH = h * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - triW * 0.45, cy - triH * 0.5);
  ctx.lineTo(cx + triW * 0.55, cy);
  ctx.lineTo(cx - triW * 0.45, cy + triH * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTikTokLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isLightBg: boolean
): void {
  ctx.save();
  ctx.fillStyle = isLightBg ? '#111827' : '#090C12';
  roundedRectPath(ctx, x, y, size, size, size * 0.24);
  ctx.fill();

  const drawNote = (ox: number, oy: number, color: string) => {
    ctx.save();
    ctx.translate(x + ox, y + oy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.4, size * 0.11);

    ctx.beginPath();
    ctx.moveTo(size * 0.54, size * 0.24);
    ctx.lineTo(size * 0.54, size * 0.64);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.54, size * 0.25);
    ctx.quadraticCurveTo(size * 0.62, size * 0.36, size * 0.74, size * 0.37);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size * 0.42, size * 0.64, size * 0.125, 0, Math.PI * 1.65);
    ctx.stroke();
    ctx.restore();
  };

  const shift = Math.max(0.8, size * 0.045);
  drawNote(-shift, -shift * 0.6, '#25F4EE');
  drawNote(shift, shift * 0.6, '#FE2C55');
  drawNote(0, 0, '#FFFFFF');
  ctx.restore();
}

function drawFacebookLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.fillStyle = '#1877F2';
  roundedRectPath(ctx, x, y, size, size, size * 0.24);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, size * 0.13);

  const stemX = x + size * 0.54;
  ctx.beginPath();
  ctx.moveTo(stemX, y + size * 0.88);
  ctx.lineTo(stemX, y + size * 0.36);
  ctx.quadraticCurveTo(stemX, y + size * 0.22, x + size * 0.68, y + size * 0.22);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.39, y + size * 0.5);
  ctx.lineTo(x + size * 0.68, y + size * 0.5);
  ctx.stroke();
  ctx.restore();
}

export interface WatermarkRenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  watermark?: WatermarkSettings;
  palette?: PalettePreset;
}

export function renderWatermarkOverlay({
  ctx,
  width,
  height,
  watermark,
  palette,
}: WatermarkRenderOptions): void {
  const cfg = normalizeWatermarkSettings(watermark);
  if (!cfg.enabled || cfg.platforms.length === 0) return;

  const layout = computeWatermarkLayout(width, height, cfg, ctx);
  const isLight = Boolean(palette?.isLight);

  ctx.save();
  ctx.globalAlpha = cfg.opacity;

  ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.58)' : 'rgba(11, 14, 20, 0.42)';
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  roundedRectPath(ctx, layout.x, layout.y, layout.boxWidth, layout.boxHeight, layout.boxHeight / 2);
  ctx.fill();
  ctx.stroke();

  let cursorX = layout.x + layout.padX;
  const iconY = layout.y + layout.padY;

  for (const platform of cfg.platforms) {
    if (platform === 'instagram') {
      drawInstagramLogo(ctx, cursorX, iconY, layout.iconSize);
    } else if (platform === 'youtube') {
      drawYouTubeLogo(ctx, cursorX, iconY, layout.iconSize);
    } else if (platform === 'tiktok') {
      drawTikTokLogo(ctx, cursorX, iconY, layout.iconSize, isLight);
    } else if (platform === 'facebook') {
      drawFacebookLogo(ctx, cursorX, iconY, layout.iconSize);
    }
    cursorX += layout.iconSize + layout.gap;
  }

  const trimmedText = (cfg.text || '').trim();
  if (trimmedText.length > 0 && layout.textWidth > 0) {
    const textGap = Math.max(6, Math.round(layout.iconSize * 0.38));
    const textX = cursorX - layout.gap + textGap;
    const textY = layout.y + layout.boxHeight / 2;
    ctx.font = `600 ${layout.fontSize}px "DM Sans", sans-serif`;
    ctx.fillStyle = isLight ? '#0F172A' : '#F8FAFC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(trimmedText, textX, textY, layout.textWidth);
  }

  ctx.restore();
}

export function renderWatermarkPreviewFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: WatermarkSettings,
  palette: PalettePreset
): void {
  ctx.save();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const centerW = width * 0.56;
  const centerH = height * 0.44;
  const centerX = (width - centerW) / 2;
  const centerY = (height - centerH) / 2 - height * 0.04;

  ctx.strokeStyle = palette.isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  roundedRectPath(ctx, centerX, centerY, centerW, centerH, 14);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = palette.isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(148, 163, 184, 0.55)';
  ctx.font = '600 12px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Area Animasi Utama', width / 2, centerY + centerH / 2);

  const subW = width * 0.52;
  const subH = 22;
  const subX = (width - subW) / 2;
  const subY = height * 0.84 - subH / 2;
  ctx.fillStyle = palette.isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  roundedRectPath(ctx, subX, subY, subW, subH, 6);
  ctx.fill();
  ctx.fillStyle = palette.isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(226, 232, 240, 0.45)';
  ctx.font = '500 10px "DM Sans", sans-serif';
  ctx.fillText('Area Subtitle', width / 2, subY + subH / 2);

  renderWatermarkOverlay({
    ctx,
    width,
    height,
    watermark: { ...watermark, enabled: true },
    palette,
  });

  ctx.restore();
}


