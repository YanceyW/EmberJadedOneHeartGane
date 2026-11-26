import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const dist = path.join(root, 'dist');

if (!fs.existsSync(path.join(dist, 'game.js'))) {
  console.error('[smoke] dist/game.js not found. Run npm run build first.');
  process.exit(1);
}

const gameJson = JSON.parse(fs.readFileSync(path.join(dist, 'game.json'), 'utf8'));
if (
  !gameJson.subpackages?.some((item) => item.root.replace(/\/$/, '') === 'games/match3')
) {
  console.error('[smoke] match3 subpackage missing from game.json');
  process.exit(1);
}

const gradient = { addColorStop() {} };
const ctx = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradient;
      }
      if (prop === 'measureText') {
        return () => ({ width: 20 });
      }
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  },
);

const canvas = {
  width: 0,
  height: 0,
  getContext: () => ctx,
};

let touchStart = null;
let touchEnd = null;

globalThis.wx = {
  createCanvas: () => canvas,
  createImage: () => ({}),
  getWindowInfo: () => ({
    windowWidth: 375,
    windowHeight: 812,
    pixelRatio: 2,
    safeArea: { top: 44, bottom: 778 },
  }),
  getSystemInfoSync: () => ({
    windowWidth: 375,
    windowHeight: 812,
    pixelRatio: 2,
  }),
  onTouchStart: (cb) => {
    touchStart = cb;
  },
  onTouchMove: () => {},
  onTouchEnd: (cb) => {
    touchEnd = cb;
  },
  onTouchCancel: () => {},
  onShow: () => {},
  onHide: () => {},
  onError: () => {},
  getStorageSync: () => undefined,
  setStorageSync: () => {},
  removeStorageSync: () => {},
  clearStorageSync: () => {},
  loadSubpackage: ({ success }) => setTimeout(success, 0),
  showModal: ({ success }) => success?.({ confirm: true, cancel: false }),
  showToast: () => {},
  shareAppMessage: () => {},
};

let frames = 0;
globalThis.requestAnimationFrame = (cb) => {
  frames += 1;
  if (frames < 12) setTimeout(() => cb(Date.now()), 16);
  return frames;
};

const errors = [];
const loggedErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  loggedErrors.push(args.map(String).join(' '));
  originalConsoleError(...args);
};
process.on('uncaughtException', (error) => {
  errors.push(error);
});
process.on('unhandledRejection', (error) => {
  errors.push(error);
});

require(path.join(dist, 'game.js'));

function tap(clientX, clientY) {
  touchStart?.({ touches: [{ identifier: 1, clientX, clientY }], changedTouches: [] });
  touchEnd?.({
    touches: [],
    changedTouches: [{ identifier: 1, clientX, clientY }],
  });
}

setTimeout(() => tap(100, 200), 40);
setTimeout(() => tap(200, 250), 220);

setTimeout(() => {
  const failed = errors.length > 0 || loggedErrors.some((line) => line.includes('openGame failed'));
  if (failed) {
    console.error('[smoke] failed');
    for (const error of errors) console.error(error);
    for (const line of loggedErrors) console.error(line);
    process.exit(1);
  }
  console.log(`[smoke] ok (${frames} frames, canvas ${canvas.width}x${canvas.height})`);
  process.exit(0);
}, 600);
