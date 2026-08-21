import {
  DEFAULT_SYSTEM_BACKGROUND,
  buildSystemColorCssVars,
  parseSystemBackground,
  BRAND_PALETTE,
} from '../../../lib/systemColors';
import { loadSystemBrandColorsFromEnv } from '../../../lib/systemColors.server';

/**
 * Render-blocking CSS for SYSTEM_COLORS + brand palette.
 * Linked from _document so the first paint already uses the env colors.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  let brand = {
    primary: BRAND_PALETTE.primary,
    secondary: BRAND_PALETTE.secondary,
    background: DEFAULT_SYSTEM_BACKGROUND,
  };
  try {
    brand = loadSystemBrandColorsFromEnv();
  } catch {
    brand.background = parseSystemBackground(process.env.SYSTEM_COLORS);
  }

  const vars = buildSystemColorCssVars(brand);
  const css = `:root{${vars}}html,body{background:var(--system-page-bg)!important;background-attachment:fixed!important;}`;

  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  return res.status(200).send(css);
}
