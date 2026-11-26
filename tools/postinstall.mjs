import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const entry = path.join(root, 'dist', 'game.js');

if (fs.existsSync(entry)) {
  console.log('[postinstall] dist/game.js exists, skip build');
  process.exit(0);
}

console.log('[postinstall] dist/game.js missing, building once...');
const result = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  // 安装不应因为构建失败而中断；开发者可以稍后手动 npm run build。
  console.warn('[postinstall] build failed, run "npm run build" manually before opening devtools');
}
