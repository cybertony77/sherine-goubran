export const BRAND_PALETTE = {
  primary: '#0F0F10', // Rich Black
  secondary: '#C9A96A', // Champagne Gold (SYSTEM_SECONDARY / accent CTA)
  surface: '#F7F4EE', // Warm Ivory
  softAccent: '#E9DDD0', // Beige
  bodyText: '#2B2B2B', // Charcoal
  mutedText: '#8A8A8A', // Gray
  white: '#FFFFFF',
  secondaryHover: '#B8954F',
  secondaryPressed: '#A8894A',
};

export const DEFAULT_SYSTEM_BACKGROUND = BRAND_PALETTE.primary;
export const DEFAULT_SYSTEM_PRIMARY = BRAND_PALETTE.primary;
export const DEFAULT_SYSTEM_SECONDARY = BRAND_PALETTE.secondary;

/**
 * Parse SYSTEM_COLORS from env.config.
 * Accepts either:
 *   - "background: linear-gradient(...);"
 *   - "linear-gradient(...)" / "#0F0F10"
 */
export function parseSystemBackground(raw) {
  if (raw == null || String(raw).trim() === '') {
    return DEFAULT_SYSTEM_BACKGROUND;
  }

  let value = String(raw).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  const match = value.match(/^\s*background\s*:\s*(.+?)\s*;?\s*$/i);
  if (match) {
    value = match[1].trim();
  } else {
    value = value.replace(/;+\s*$/, '').trim();
  }

  return value || DEFAULT_SYSTEM_BACKGROUND;
}

export function parseHexColor(raw, fallback) {
  if (raw == null || String(raw).trim() === '') return fallback;
  let value = String(raw).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    return fallback;
  }
  return value;
}

/** Extract first/last color stops from a CSS linear-gradient (for canvas). */
export function parseGradientColorStops(backgroundCss) {
  const bg = parseSystemBackground(backgroundCss);
  const colors = bg.match(/#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)/g) || [];
  if (colors.length >= 2) {
    return { start: colors[0], end: colors[colors.length - 1] };
  }
  if (colors.length === 1) {
    return { start: colors[0], end: colors[0] };
  }
  return { start: BRAND_PALETTE.primary, end: BRAND_PALETTE.secondary };
}

/** Build a canvas linear gradient using SYSTEM_COLORS stops. */
export function createSystemCanvasGradient(ctx, x0, y0, x1, y1, backgroundCss) {
  const { start, end } = parseGradientColorStops(backgroundCss);
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  return gradient;
}

/** Resolve current page background on the client (CSS var → cache → default). */
export function getClientSystemBackground(fallback) {
  if (fallback) return parseSystemBackground(fallback);
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_BACKGROUND;
  try {
    const fromCss = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--system-page-bg')
      .trim();
    if (fromCss) return fromCss;
    const cached = window.sessionStorage.getItem('system-page-bg');
    if (cached) return cached;
  } catch {
    /* ignore */
  }
  return DEFAULT_SYSTEM_BACKGROUND;
}

/** CSS custom properties string for :root */
export function buildSystemColorCssVars({
  primary = DEFAULT_SYSTEM_PRIMARY,
  secondary = DEFAULT_SYSTEM_SECONDARY,
  background = DEFAULT_SYSTEM_BACKGROUND,
} = {}) {
  return [
    `--system-page-bg:${background}`,
    `--system-primary:${primary}`,
    `--system-secondary:${secondary}`,
    `--system-secondary-hover:${BRAND_PALETTE.secondaryHover}`,
    `--system-secondary-pressed:${BRAND_PALETTE.secondaryPressed}`,
    `--system-surface:${BRAND_PALETTE.surface}`,
    `--system-soft-accent:${BRAND_PALETTE.softAccent}`,
    `--system-body-text:${BRAND_PALETTE.bodyText}`,
    `--system-muted-text:${BRAND_PALETTE.mutedText}`,
    `--system-white:${BRAND_PALETTE.white}`,
  ].join(';');
}
