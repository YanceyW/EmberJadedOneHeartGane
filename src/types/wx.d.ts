interface WxTouch {
  clientX: number;
  clientY: number;
  identifier: number;
}

interface WxTouchEvent {
  touches: WxTouch[];
  changedTouches: WxTouch[];
}

interface WxApi {
  createCanvas(): any;
  createImage(): any;
  getWindowInfo?(): any;
  getSystemInfoSync(): any;
  onTouchStart(cb: (event: WxTouchEvent) => void): void;
  onTouchMove(cb: (event: WxTouchEvent) => void): void;
  onTouchEnd(cb: (event: WxTouchEvent) => void): void;
  onTouchCancel(cb: (event: WxTouchEvent) => void): void;
  onShow(cb: () => void): void;
  onHide(cb: () => void): void;
  onError(cb: (error: unknown) => void): void;
  getStorageSync(key: string): any;
  setStorageSync(key: string, data: any): void;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  loadSubpackage(options: {
    name: string;
    success?: () => void;
    fail?: (error: unknown) => void;
    complete?: () => void;
  }): void;
  showModal?(options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
    success?: (result: { confirm: boolean; cancel: boolean }) => void;
    fail?: (error: unknown) => void;
  }): void;
  showToast?(options: { title: string; icon?: string; duration?: number }): void;
  vibrateShort?(options?: { type?: string; fail?: (error: unknown) => void }): void;
  shareAppMessage?(options: { title: string; imageUrl?: string; query?: string }): void;
  cloud?: any;
}

declare const wx: WxApi;
declare const GameGlobal: any;
declare function require(path: string): unknown;
declare const module: { exports: any };
