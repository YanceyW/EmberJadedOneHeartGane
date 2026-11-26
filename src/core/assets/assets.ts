import { platform } from '../../shared/platform/wx';

export class AssetService {
  private readonly images = new Map<string, any>();

  loadImage(path: string): Promise<any> {
    const cached = this.images.get(path);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const image = platform.createImage();
      image.onload = () => {
        this.images.set(path, image);
        resolve(image);
      };
      image.onerror = () => reject(new Error(`Failed to load image: ${path}`));
      image.src = path;
    });
  }

  getImage(path: string): any | undefined {
    return this.images.get(path);
  }

  releaseGroup(_group: string): void {
    // 资源分组在资产清单接入后启用；当前阶段没有位图资源。
  }
}
