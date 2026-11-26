import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'assets');
const target = path.join(root, 'dist', 'assets');

if (!fs.existsSync(source)) {
  console.log('[assets] no assets directory, skipped');
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });

const sharedFrom = path.join(source, 'shared');
if (fs.existsSync(sharedFrom)) {
  fs.cpSync(sharedFrom, path.join(target, 'shared'), {
    recursive: true,
    filter: (item) => !item.split(path.sep).includes('raw'),
  });
  console.log('[assets] shared -> dist/assets/shared (main package)');
}

// 游戏独有资产必须跟着分包走，否则会占满主包。
const gamesFrom = path.join(source, 'games');
if (fs.existsSync(gamesFrom)) {
  for (const entry of fs.readdirSync(gamesFrom, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_template') continue;
    const distGame = path.join(root, 'dist', 'games', entry.name);
    if (!fs.existsSync(distGame)) {
      console.log(`[assets] ${entry.name} skipped (no compiled subpackage yet)`);
      continue;
    }
    fs.cpSync(path.join(gamesFrom, entry.name), path.join(distGame, 'assets'), {
      recursive: true,
      filter: (item) => !item.split(path.sep).includes('raw'),
    });
    console.log(`[assets] games/${entry.name} -> dist/games/${entry.name}/assets (subpackage)`);
  }
}
