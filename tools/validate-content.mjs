import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gamesDir = path.join(root, 'src', 'games');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(full);
    }
  }
  return files;
}

let checked = 0;
for (const file of walk(gamesDir)) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    checked += 1;
  } catch (error) {
    console.error(`[content] invalid JSON: ${path.relative(root, file)}`);
    console.error(error.message);
    process.exit(1);
  }
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'tools', 'games.manifest.json'), 'utf8').replace(/^\uFEFF/, ''),
);
const ids = new Set();
for (const game of manifest.games) {
  if (ids.has(game.id)) {
    console.error(`[content] duplicate game id: ${game.id}`);
    process.exit(1);
  }
  ids.add(game.id);
}

console.log(`[content] ${checked} json file(s), ${manifest.games.length} game(s) ok`);
