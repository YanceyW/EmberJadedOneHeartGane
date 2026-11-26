export interface WindowMetrics {
  width: number;
  height: number;
  pixelRatio: number;
  safeTop: number;
  safeBottom: number;
}

export interface TapPoint {
  id: number;
  x: number;
  y: number;
}

let canvas: any = null;

function readWindowInfo(): any {
  if (typeof wx.getWindowInfo === 'function') return wx.getWindowInfo();
  return wx.getSystemInfoSync();
}

export const platform = {
  getMetrics(): WindowMetrics {
    const info = readWindowInfo();
    const width = info.windowWidth ?? info.screenWidth ?? 375;
    const height = info.windowHeight ?? info.screenHeight ?? 667;
    const pixelRatio = Math.min(info.pixelRatio ?? 2, 3);
    const safeArea = info.safeArea;
    return {
      width,
      height,
      pixelRatio,
      safeTop: safeArea ? safeArea.top : 20,
      safeBottom: safeArea ? Math.max(0, height - safeArea.bottom) : 0,
    };
  },

  createCanvas(): any {
    if (!canvas) canvas = wx.createCanvas();
    return canvas;
  },

  // 离屏画布：用于预烘焙 sprite 图集与程序化缓存。
  createOffscreenCanvas(width: number, height: number): any {
    const offscreen = wx.createCanvas();
    offscreen.width = Math.max(1, Math.round(width));
    offscreen.height = Math.max(1, Math.round(height));
    return offscreen;
  },

  createImage(): any {
    return wx.createImage();
  },

  getDeviceInfo(): { benchmarkLevel?: number; platform?: string; brand?: string } {
    try {
      if (typeof wx.getDeviceInfo === 'function') return wx.getDeviceInfo();
    } catch {
      // 低版本没有该接口时返回空对象。
    }
    return {};
  },

  createWebAudioContext(): any | null {
    try {
      if (typeof wx.createWebAudioContext === 'function') return wx.createWebAudioContext();
    } catch {
      // 无 WebAudio 能力时静默降级。
    }
    return null;
  },

  createInnerAudioContext(): any | null {
    try {
      if (typeof wx.createInnerAudioContext === 'function') return wx.createInnerAudioContext();
    } catch {
      // ignore
    }
    return null;
  },

  setInnerAudioOption(obeyMuteSwitch: boolean): void {
    try {
      wx.setInnerAudioOption?.({ obeyMuteSwitch });
    } catch {
      // ignore
    }
  },

  storage: {
    get(key: string): any {
      try {
        return wx.getStorageSync(key);
      } catch {
        return undefined;
      }
    },
    set(key: string, value: any): void {
      try {
        wx.setStorageSync(key, value);
      } catch {
        // 存储失败不阻塞游戏，下一次写入会覆盖。
      }
    },
    remove(key: string): void {
      try {
        wx.removeStorageSync(key);
      } catch {
        // ignore
      }
    },
    clear(): void {
      try {
        wx.clearStorageSync();
      } catch {
        // ignore
      }
    },
  },

  onTouchStart(cb: (event: WxTouchEvent) => void): void {
    wx.onTouchStart(cb);
  },
  onTouchMove(cb: (event: WxTouchEvent) => void): void {
    wx.onTouchMove(cb);
  },
  onTouchEnd(cb: (event: WxTouchEvent) => void): void {
    wx.onTouchEnd(cb);
  },
  onTouchCancel(cb: (event: WxTouchEvent) => void): void {
    wx.onTouchCancel(cb);
  },

  onShow(cb: () => void): void {
    wx.onShow(cb);
  },
  onHide(cb: () => void): void {
    wx.onHide(cb);
  },
  onError(cb: (error: unknown) => void): void {
    wx.onError(cb);
  },

  loadSubpackage(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.loadSubpackage({
        name,
        success: () => resolve(),
        fail: (error) => reject(error),
      });
    });
  },

  showModal(title: string, content: string): Promise<boolean> {
    if (typeof wx.showModal !== 'function') return Promise.resolve(false);
    return new Promise((resolve) => {
      wx.showModal?.({
        title,
        content,
        confirmText: '确定',
        cancelText: '取消',
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false),
      });
    });
  },

  toast(message: string): void {
    wx.showToast?.({ title: message, icon: 'none', duration: 1600 });
  },

  vibrate(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    try {
      if (typeof wx === 'undefined') return;
      wx.vibrateShort?.({ type });
    } catch {
      // 部分设备/工具链不支持震动，忽略即可。
    }
  },

  share(title: string, imageUrl?: string): void {
    wx.shareAppMessage?.({ title, imageUrl });
  },

  cloud: {
    available(): boolean {
      return Boolean(wx.cloud);
    },
    init(env: string): void {
      wx.cloud?.init({ env, traceUser: true });
    },
    callFunction<T>(name: string, data?: Record<string, unknown>): Promise<T> {
      try {
        // wx.cloud.callFunction 在未初始化/环境错误时会同步抛错，这里统一包成 Promise。
        return Promise.resolve(wx.cloud.callFunction({ name, data })).then(
          (result: any) => result.result as T,
        );
      } catch (error) {
        return Promise.reject(error);
      }
    },
  },
};
