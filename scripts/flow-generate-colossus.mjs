// scripts/flow-generate-colossus.mjs
// Bridges Frontier Studio MCP with Google Flow AI Engine (googleflow_mcp)
// Generates:
// 1. Imagen 3 3-panel sheets for char_corvus, char_malic, char_colossus
// 2. Imagen 3 location plate for loc_caldera_forge
// 3. Studio-grade voice stems (Journey HD / Gemini 2.0) for each sequence shot
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText } from '../src/store/fs.js';
import { filmShow } from '../src/store/film.js';
import { loadConfig } from '../src/config.js';
import { attachImage } from '../src/store/asset.js';

const cfg = loadConfig();
const FILM_ID = 'film_heart_of_colossus';
const paths = studioPaths(cfg.studioRoot);
const meta = await filmShow(paths, FILM_ID);

console.log('⚡ ========================================================');
console.log(`   GOOGLE FLOW AI PIPELINE: ${meta.title}`);
console.log('   Models: Imagen 3 (imagen-3.0-generate-002) + Journey HD TTS');
console.log('==========================================================\n');

const PYTHON_EXE = 'c:/Users/hp/Documents/PROJECTS/googleflow_mcp/.venv/Scripts/python.exe';

function runGoogleFlow(command) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_EXE, ['-c', command], {
      cwd: 'c:/Users/hp/Documents/PROJECTS/googleflow_mcp',
      env: { ...process.env, PYTHONPATH: 'c:/Users/hp/Documents/PROJECTS/googleflow_mcp' }
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`GoogleFlow exited code ${code}: ${err}`));
    });
  });
}

// ── 1. Generate 3-Panel Headless Character Sheets ────────────────────────────
const characters = [
  { id: 'char_corvus', role: 'Master Smith Corvus Vance', archetype: 'weathered baritone forge master' },
  { id: 'char_malic', role: 'Enforcer Malic', archetype: 'armored inquisitor, cold steel plate' },
  { id: 'char_colossus', role: 'The Colossus Ignis-Vael', archetype: 'primordial stone colossus with cracked magma heart' }
];

for (const char of characters) {
  const dir = `${cfg.studioRoot}/films/${FILM_ID}/assets/characters/${char.id}`;
  const targetSheet = `${dir}/sheet.png`;
  if (existsSync(targetSheet)) {
    console.log(`[EXISTS] Sheet for ${char.id} already built — skipping`);
    continue;
  }
  await mkdir(dir, { recursive: true });
  console.log(`⏳ Generating Imagen 3 Turnaround Sheet for ${char.role} (${char.id})...`);
  const prompt = `Three-panel character turnaround sheet: front view on left, 45-degree three-quarter profile in center, pure profile on right. Same character: ${char.role}, ${char.archetype}. Studio key light with rim lighting, clean dark backdrop, authentic 35mm film stock, 8k resolution, raw photorealism.`;
  
  const cmd = `
import asyncio
from src.server import generate_image
res = asyncio.run(generate_image(${JSON.stringify(prompt)}, ${JSON.stringify(targetSheet)}, '16:9'))
print(res)
`;
  const result = await runGoogleFlow(cmd);
  console.log(`✅ Attached sheet → ${targetSheet}`);
}

// ── 2. Generate Location Plate ───────────────────────────────────────────────
const locDir = `${cfg.studioRoot}/films/${FILM_ID}/assets/locations/loc_caldera_forge`;
const targetPlate = `${locDir}/plate.png`;
if (!existsSync(targetPlate)) {
  await mkdir(locDir, { recursive: true });
  console.log('⏳ Generating Imagen 3 Keyframe Plate for Caldera Forge (loc_caldera_forge)...');
  const platePrompt = 'Cinematic establishing wide shot, Panavision C-Series 35mm Anamorphic, 2.39:1 scope. Subterranean caldera forge cavern with rivers of glowing 2400K orange magma, towering obsidian basalt pillars, giant anvil altar in foreground, atmospheric particulate embers, chiaroscuro contrast, Kodak 5219 500T film grain.';
  const cmd = `
import asyncio
from src.server import generate_image
res = asyncio.run(generate_image(${JSON.stringify(platePrompt)}, ${JSON.stringify(targetPlate)}, '16:9'))
print(res)
`;
  await runGoogleFlow(cmd);
  console.log(`✅ Attached location plate → ${targetPlate}`);
} else {
  console.log('[EXISTS] Location plate for loc_caldera_forge already built — skipping');
}

// ── 3. Synthesize Character Dialogue Stems ──────────────────────────────────
const audioDir = `${cfg.studioRoot}/films/${FILM_ID}/audio`;
await mkdir(audioDir, { recursive: true });

const shots = [
  { shot: 'shot01', text: 'They told you gods cannot die. They lied to make the dying easier.', voice: 'en-US-Journey-D' },
  { shot: 'shot02', text: 'Six hundred years under stone, and your pulse still rings in my anvil.', voice: 'en-US-Journey-D' },
  { shot: 'shot03', text: 'If you strike the seal, Vance, you doom us both.', voice: 'Fenrir' },
  { shot: 'shot04', text: 'Then stand closer.', voice: 'en-US-Journey-D' },
  { shot: 'shot05', text: 'Steel cools, Malic. Blood does not.', voice: 'en-US-Journey-D' },
  { shot: 'shot06', text: 'Hold your breath. This is where history loses its nerve.', voice: 'en-US-Journey-D' },
  { shot: 'shot07', text: 'Ignis-Vael awakens. The mountain answers.', voice: 'en-US-Journey-D' },
  { shot: 'shot08', text: 'A god with a forged heart owes allegiance only to the smith.', voice: 'en-US-Journey-D' }
];

console.log('\n🎙️ Synthesizing Dialogue Stems (Journey HD & Gemini 2.0 Speech)...');
for (const s of shots) {
  const targetWav = `${audioDir}/${s.shot}_voice.wav`;
  if (existsSync(targetWav)) {
    console.log(`[EXISTS] Audio stem for ${s.shot} already exists — skipping`);
    continue;
  }
  const cmd = `
import asyncio
from src.server import synthesize_voice
res = asyncio.run(synthesize_voice(${JSON.stringify(s.text)}, ${JSON.stringify(targetWav)}, ${JSON.stringify(s.voice)}))
print(res)
`;
  await runGoogleFlow(cmd);
  console.log(`✅ Synthesized voice stem for ${s.shot} (${s.voice}) → ${targetWav}`);
}

console.log('\n🎉 ========================================================');
console.log('   GOOGLE FLOW ASSETS FULLY GENERATED & LOCKED!');
console.log('   All character sheets, environment plates, and voice stems ready.');
console.log('==========================================================\n');
