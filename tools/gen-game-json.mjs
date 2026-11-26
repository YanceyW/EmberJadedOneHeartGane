import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'tools', 'games.manifest.json'), 'utf8').replace(/^\uFEFF/, ''),
);

if (!fs.existsSync(dist)) {
  throw new Error('dist not found. Run tsc first.');
}

const subpackages = manifest.games
  .filter((game) => game.status === 'playable')
  .map((game) => ({
    name: game.packageName,
    root: game.root.endsWith('/') ? game.root : `${game.root}/`,
  }));

const gameJson = {
  deviceOrientation: 'portrait',
  showStatusBar: false,
  networkTimeout: {
    request: 10000,
    connectSocket: 10000,
    uploadFile: 10000,
    downloadFile: 10000,
  },
  subpackages,
};

fs.writeFileSync(path.join(dist, 'game.json'), `${JSON.stringify(gameJson, null, 2)}\n`, 'utf8');
console.log(`[game.json] ${subpackages.length} subpackage(s)`);
