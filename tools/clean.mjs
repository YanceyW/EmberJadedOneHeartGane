import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');

if (!fs.existsSync(dist)) {
  console.log('[clean] dist not found, skipped');
  process.exit(0);
}

// 微信开发者工具会占用 dist 内的文件；占用时删除会失败并留下旧编译产物，
// 而旧产物可能与新源码的目录结构冲突（例如被移动过的文件）。
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    fs.rmSync(dist, { recursive: true, force: true });
    console.log('[clean] dist removed');
    process.exit(0);
  } catch (error) {
    if (attempt === 3) {
      console.error('[clean] cannot remove dist, close WeChat devtools and retry');
      throw error;
    }
    const wait = attempt * 400;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
  }
}
