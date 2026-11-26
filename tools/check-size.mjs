import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const manifestPath = path.join(root, 'tools', 'games.manifest.json');

if (!fs.existsSync(dist)) {
  console.error('[size] dist not found. Run npm run build first.');
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function sizeOf(dir) {
  if (!fs.existsSync(dir)) return 0;
  return walk(dir).reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
const subpackages = manifest.games.filter((game) => game.status === 'playable');

const total = sizeOf(dist);
const subSizes = subpackages.map((game) => ({
  name: game.title,
  root: game.root,
  bytes: sizeOf(path.join(dist, game.root)),
}));
const subTotal = subSizes.reduce((sum, item) => sum + item.bytes, 0);
const main = total - subTotal;

console.log('\n[size] package budget');
console.log(`  main      ${mb(main)} / 3.20MB`);
for (const item of subSizes) {
  console.log(`  ${item.name.padEnd(8)} ${mb(item.bytes)} / 2.50MB`);
}
console.log(`  total     ${mb(total)} / 30.00MB`);

let failed = false;
if (main > 3.2 * 1024 * 1024) {
  console.error('[size] main package exceeds 3.2MB');
  failed = true;
}
for (const item of subSizes) {
  if (item.bytes > 2.5 * 1024 * 1024) {
    console.error(`[size] ${item.name} exceeds 2.5MB`);
    failed = true;
  }
}
if (total > 30 * 1024 * 1024) {
  console.error('[size] total package exceeds 30MB');
  failed = true;
}

if (failed) process.exit(1);
console.log('[size] ok\n');
