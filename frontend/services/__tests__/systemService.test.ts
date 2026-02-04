import systemService from '../systemService';
import api from '../api';

// Mock the api module
jest.mock('../api', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
}));

describe('systemService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getConfig calls /system/config', async () => {
    const mockData = [{ key: 'test', value: '123' }];
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });
    
    const result = await systemService.getConfig();
    expect(api.get).toHaveBeenCalledWith('/system/config');
    expect(result).toEqual(mockData);
  });

  it('updateConfig calls PUT /system/config', async () => {
    const mockConfig = { key: 'test', value: 'new_val' };
    (api.put as jest.Mock).mockResolvedValue({ data: mockConfig });
    
    const result = await systemService.updateConfig(mockConfig);
    expect(api.put).toHaveBeenCalledWith('/system/config', mockConfig);
    expect(result).toEqual(mockConfig);
  });

  it('getMetrics calls /system/metrics', async () => {
    const mockMetrics = { total_users: 10 };
    (api.get as jest.Mock).mockResolvedValue({ data: mockMetrics });
    
    const result = await systemService.getMetrics();
    expect(api.get).toHaveBeenCalledWith('/system/metrics');
    expect(result).toEqual(mockMetrics);
  });

  it('getHealth calls /system/health', async () => {
    const mockHealth = { status: 'ok' };
    (api.get as jest.Mock).mockResolvedValue({ data: mockHealth });
    
    const result = await systemService.getHealth();
    expect(api.get).toHaveBeenCalledWith('/system/health');
    expect(result).toEqual(mockHealth);
  });

  it('getLogs calls /system/logs with params', async () => {
    const mockLogs = [{ id: 1, action: 'TEST' }];
    (api.get as jest.Mock).mockResolvedValue({ data: mockLogs });
    
    await systemService.getLogs({ limit: 10, action: 'LOGIN' });
    expect(api.get).toHaveBeenCalledWith('/system/logs', { params: { limit: 10, action: 'LOGIN' } });
  });

  it('cleanupLogs calls POST /system/cleanup', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { message: 'Done' } });
    
    await systemService.cleanupLogs(30);
    expect(api.post).toHaveBeenCalledWith('/system/cleanup?days=30');
  });
});
