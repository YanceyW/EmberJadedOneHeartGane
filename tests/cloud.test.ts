import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudService } from '../src/core/cloud/cloud';
import { platform } from '../src/shared/platform/wx';

describe('cloud service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('stays offline when no env is configured', async () => {
    const service = new CloudService(false);
    await service.init();
    expect(service.status).toBe('offline');
    expect(service.openid).toBe('');
  });

  it('goes online after login returns an openid', async () => {
    vi.spyOn(platform.cloud, 'available').mockReturnValue(true);
    vi.spyOn(platform.cloud, 'init').mockImplementation(() => undefined);
    const call = vi.spyOn(platform.cloud, 'callFunction');
    call.mockResolvedValue({ openid: 'openid-1' } as never);

    const service = new CloudService(true);
    await service.init();

    expect(service.status).toBe('online');
    expect(service.openid).toBe('openid-1');
    expect(call).toHaveBeenCalledWith('login');
  });

  it('falls back to offline when the cloud function fails', async () => {
    vi.spyOn(platform.cloud, 'available').mockReturnValue(true);
    vi.spyOn(platform.cloud, 'init').mockImplementation(() => undefined);
    vi.spyOn(platform.cloud, 'callFunction').mockRejectedValue(new Error('function not found'));

    const service = new CloudService(true);
    await service.init();

    expect(service.status).toBe('offline');
    expect(service.openid).toBe('');
  });

  it('stays offline when the runtime has no cloud support', async () => {
    vi.spyOn(platform.cloud, 'available').mockReturnValue(false);
    const init = vi.spyOn(platform.cloud, 'init').mockImplementation(() => undefined);

    const service = new CloudService(true);
    await service.init();

    expect(service.status).toBe('offline');
    expect(init).not.toHaveBeenCalled();
  });
});
