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
function createMockCtx() {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => gradient;
        }
        if (prop === 'measureText') {
          return () => ({ width: 20 });
        }
        if (prop === 'getImageData') {
          return () => ({ data: new Uint8ClampedArray(4) });
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
}

// 微信里 wx.createCanvas() 每次返回新画布；主画布与离屏图集必须分开。
const createdCanvases = [];
function createMockCanvas() {
  const c = {
    width: 0,
    height: 0,
    getContext: () => createMockCtx(),
  };
  createdCanvases.push(c);
  return c;
}

let touchStart = null;
let touchEnd = null;

const cloudCalls = [];
const audioCalls = [];

function createMockAudioParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
  };
}

function createMockNode() {
  const node = {
    connect() {
      return node;
    },
    disconnect() {},
    start() {
      audioCalls.push('start');
    },
    stop() {},
    onended: null,
  };
  return node;
}

// 最小 WebAudio 假实现：只要能跑通合成路径且不抛错即可。
const mockAudioCtx = {
  currentTime: 0,
  sampleRate: 44100,
  destination: createMockNode(),
  createGain: () => ({ ...createMockNode(), gain: createMockAudioParam() }),
  createOscillator: () => ({
    ...createMockNode(),
    type: 'sine',
    frequency: createMockAudioParam(),
  }),
  createBiquadFilter: () => ({
    ...createMockNode(),
    type: 'lowpass',
    frequency: createMockAudioParam(),
    Q: createMockAudioParam(),
  }),
  createBufferSource: () => ({ ...createMockNode(), buffer: null }),
  createBuffer: (_channels, length) => ({
    getChannelData: () => new Float32Array(length),
  }),
  resume: () => Promise.resolve(),
  suspend: () => Promise.resolve(),
};

const mockBgm = {
  src: '',
  loop: false,
  volume: 0.5,
  obeyMuteSwitch: true,
  play: () => Promise.resolve(),
  pause: () => {},
  stop: () => {},
};

globalThis.wx = {
  createCanvas: () => createMockCanvas(),
  createImage: () => ({}),
  createWebAudioContext: () => mockAudioCtx,
  createInnerAudioContext: () => mockBgm,
  setInnerAudioOption: () => {},
  vibrateShort: () => {
    audioCalls.push('vibrate');
  },
  getDeviceInfo: () => ({ benchmarkLevel: 20, platform: 'devtools' }),
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
  // 模拟已部署的云函数，让冒烟覆盖 登录 → 存取档 → 排行榜 整条链路。
  cloud: {
    init: () => {},
    callFunction: ({ name, data }) => {
      cloudCalls.push(name);
      if (name === 'login') return Promise.resolve({ result: { openid: 'smoke-openid' } });
      if (name === 'sync') return Promise.resolve({ result: { revision: 1, data: data?.data } });
      if (name === 'submitScore') return Promise.resolve({ result: { rank: 1, best: 0 } });
      if (name === 'leaderboard') {
        return Promise.resolve({
          result: {
            entries: [
              { rank: 1, score: 2400 },
              { rank: 2, score: 1800 },
            ],
          },
        });
      }
      return Promise.resolve({ result: {} });
    },
  },
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
  // 模拟 wx.loadSubpackage：运行时下载完会自动执行分包根目录的 game.js 入口。
  loadSubpackage: ({ name, success, fail }) => {
    try {
      require(path.join(dist, 'games', name, 'game.js'));
      setTimeout(success, 0);
    } catch (error) {
      if (fail) fail(error);
      else throw error;
    }
  },
  showModal: ({ success }) => success?.({ confirm: true, cancel: false }),
  showToast: () => {},
  shareAppMessage: () => {},
};

let frames = 0;
globalThis.requestAnimationFrame = (cb) => {
  frames += 1;
  if (frames < 400) setTimeout(() => cb(Date.now()), 16);
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

// 设计坐标 → 客户端坐标（375 宽的模拟屏，scale = 0.5）
const SCALE = 375 / 750;
const BOARD_X = 45;
const BOARD_Y = 88 + 250; // safeTop(44) / 0.5 + 250
const CELL = 82.5;

function tapCell(row, col) {
  const dx = BOARD_X + (col + 0.5) * CELL;
  const dy = BOARD_Y + (row + 0.5) * CELL;
  tap(dx * SCALE, dy * SCALE);
}

// 排行榜 → 关闭 → 进入三消
setTimeout(() => tap(73, 742), 40);
setTimeout(() => tap(187, 538), 120);

// 扫一遍前几行的相邻交换，必然能命中至少一次有效三连，
// 从而覆盖 交换 → 消除 → 下落 → 音效/粒子 的完整链路。
let delay = 260;
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 6; col += 1) {
    const r = row;
    const c = col;
    setTimeout(() => {
      tapCell(r, c);
      setTimeout(() => tapCell(r, c + 1), 24);
    }, delay);
    delay += 90;
  }
}

setTimeout(() => {
  const failed =
    errors.length > 0 ||
    loggedErrors.some(
      (line) => line.includes('openGame failed') || line.includes('uncaught'),
    );
  if (failed) {
    console.error('[smoke] failed');
    for (const error of errors) console.error(error);
    for (const line of loggedErrors) console.error(line);
    process.exit(1);
  }

  for (const required of ['login', 'sync', 'leaderboard']) {
    if (!cloudCalls.includes(required)) {
      console.error(`[smoke] failed: cloud function "${required}" was not called`);
      process.exit(1);
    }
  }

  // 合成音效至少应该起振一次，说明出手动真的有反馈。
  if (!audioCalls.includes('start')) {
    console.error('[smoke] failed: no synthesized sfx was played');
    process.exit(1);
  }

  const mainCanvas = createdCanvases[0] ?? { width: 0, height: 0 };
  console.log(
    `[smoke] ok (${frames} frames, canvas ${mainCanvas.width}x${mainCanvas.height}, ` +
      `cloud: ${cloudCalls.join(',')}, audio: ${audioCalls.length} events)`,
  );
  process.exit(0);
}, delay + 1200);
