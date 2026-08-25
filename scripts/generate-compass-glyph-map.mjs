// scripts/generate-compass-glyph-map.mjs
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('node_modules/@mattermost/compass-icons/config.json');
const outFile = path.resolve('dist/assets/compassGlyphMap.ts');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const glyphs = config.glyphs ?? [];

const entries = glyphs
  .map((glyph) => {
    const name = glyph.css;
    const code = glyph.code;

    if (!name || typeof code !== 'number') {
      return null;
    }

    return [name, code];
  })
  .filter(Boolean)
  .sort(([a], [b]) => a.localeCompare(b));

const body = entries
  .map(([name, code]) => `  '${name}': 0x${code.toString(16)},`)
  .join('\n');

fs.mkdirSync(path.dirname(outFile), {recursive: true});

fs.writeFileSync(
  outFile,
  `export const compassGlyphMap = {\n${body}\n} as const;\n`
);