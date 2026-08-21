import fs from 'fs';
import path from 'path';
import {
  DEFAULT_SYSTEM_BACKGROUND,
  DEFAULT_SYSTEM_PRIMARY,
  DEFAULT_SYSTEM_SECONDARY,
  parseSystemBackground,
  parseHexColor,
} from './systemColors';

function readEnvConfigFile() {
  const candidates = [
    path.join(process.cwd(), '..', 'env.config'),
    path.join(process.cwd(), 'env.config'),
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) return {};

  const envVars = {};
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    });
  return envVars;
}

/** Server-only: read SYSTEM_COLORS from env.config */
export function loadSystemBackgroundFromEnv() {
  try {
    const envVars = readEnvConfigFile();
    return parseSystemBackground(envVars.SYSTEM_COLORS || process.env.SYSTEM_COLORS);
  } catch {
    return parseSystemBackground(process.env.SYSTEM_COLORS);
  }
}

/** Server-only: load primary/secondary brand colors from env.config */
export function loadSystemBrandColorsFromEnv() {
  try {
    const envVars = readEnvConfigFile();
    return {
      primary: parseHexColor(
        envVars.SYSTEM_PRIMARY_COLOR || process.env.SYSTEM_PRIMARY_COLOR,
        DEFAULT_SYSTEM_PRIMARY
      ),
      secondary: parseHexColor(
        envVars.SYSTEM_SECONDARY_COLOR || process.env.SYSTEM_SECONDARY_COLOR,
        DEFAULT_SYSTEM_SECONDARY
      ),
      background: parseSystemBackground(
        envVars.SYSTEM_COLORS || process.env.SYSTEM_COLORS
      ),
    };
  } catch {
    return {
      primary: parseHexColor(process.env.SYSTEM_PRIMARY_COLOR, DEFAULT_SYSTEM_PRIMARY),
      secondary: parseHexColor(
        process.env.SYSTEM_SECONDARY_COLOR,
        DEFAULT_SYSTEM_SECONDARY
      ),
      background: parseSystemBackground(process.env.SYSTEM_COLORS),
    };
  }
}

/** Server-only: load SYSTEM_NAME from env.config (always re-read from disk). */
export function loadSystemNameFromEnv() {
  try {
    const envVars = readEnvConfigFile();
    return (
      String(envVars.SYSTEM_NAME || process.env.SYSTEM_NAME || '').trim() ||
      'Sherine Goubran'
    );
  } catch {
    return String(process.env.SYSTEM_NAME || '').trim() || 'Sherine Goubran';
  }
}

export { DEFAULT_SYSTEM_BACKGROUND };
