import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const inline = args.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const id = arg('id');
const title = arg('title');
const subtitle = arg('subtitle', '新的王都场馆');
const accent = arg('accent', 'mint');

if (!id || !/^[a-z][a-z0-9-]{1,24}$/.test(id)) {
  console.error('Usage: npm run new:game -- --id=match3 --title=王都三消 [--subtitle=...] [--accent=mint]');
  process.exit(1);
}
if (!title) {
  console.error('Missing --title');
  process.exit(1);
}

const templateDir = path.join(root, 'src', 'games', '_template');
const targetDir = path.join(root, 'src', 'games', id);

if (!fs.existsSync(templateDir)) {
  console.error('[new-game] src/games/_template not found');
  process.exit(1);
}
if (fs.existsSync(targetDir)) {
  console.error(`[new-game] ${path.relative(root, targetDir)} already exists`);
  process.exit(1);
}

fs.cpSync(templateDir, targetDir, { recursive: true });

function replaceInDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInDir(full);
      continue;
    }
    if (!/\.(ts|json|md)$/.test(entry.name)) continue;
    const text = fs
      .readFileSync(full, 'utf8')
      .replaceAll('__ID__', id)
      .replaceAll('__TITLE__', title)
      .replaceAll('__SUBTITLE__', subtitle)
      .replaceAll('__ACCENT__', accent);
    fs.writeFileSync(full, text, 'utf8');
  }
}
replaceInDir(targetDir);

const manifestPath = path.join(root, 'tools', 'games.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
if (manifest.games.some((game) => game.id === id)) {
  console.error(`[new-game] manifest already has ${id}`);
  process.exit(1);
}
manifest.games.push({
  id,
  title,
  subtitle,
  packageName: id,
  root: `games/${id}`,
  status: 'coming-soon',
  accent,
});
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const designTemplate = path.join(root, 'docs', 'game-design', '_template.md');
const designTarget = path.join(root, 'docs', 'game-design', `${id}.md`);
if (fs.existsSync(designTemplate) && !fs.existsSync(designTarget)) {
  const text = fs
    .readFileSync(designTemplate, 'utf8')
    .replaceAll('__ID__', id)
    .replaceAll('__TITLE__', title);
  fs.writeFileSync(designTarget, text, 'utf8');
}

console.log(`[new-game] created ${path.relative(root, targetDir)}`);
console.log('[new-game] next: implement GameDefinition, add tests, set status to "playable"');
