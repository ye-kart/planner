import { getMcpConfig } from '@planner/api';

describe('MCP configuration', () => {
  it('fails closed in production without a canonical HTTPS resource', () => {
    expect(getMcpConfig({ NODE_ENV: 'production' }).enabled).toBe(false);
    expect(getMcpConfig({
      NODE_ENV: 'production',
      PLANNER_MCP_RESOURCE_URL: 'http://planner.example/mcp',
    }).enabled).toBe(false);
    expect(getMcpConfig({
      NODE_ENV: 'production',
      PLANNER_MCP_RESOURCE_URL: 'https://planner.example/not-mcp',
    }).enabled).toBe(false);
  });

  it('normalizes safe hostname allowlists and rejects ports or URLs', () => {
    const config = getMcpConfig({
      NODE_ENV: 'production',
      PLANNER_MCP_RESOURCE_URL: 'https://planner.example/mcp',
      PLANNER_MCP_ALLOWED_HOSTS: 'proxy.example, [::1], ::1, proxy.example:443, https://bad.example',
    });

    expect(config.enabled).toBe(true);
    expect(config.allowedHosts).toEqual(['planner.example', 'proxy.example', '[::1]']);
  });

  it('supports IPv6 localhost for local development', () => {
    const config = getMcpConfig({
      NODE_ENV: 'development',
      PLANNER_MCP_RESOURCE_URL: 'http://[::1]:3000/mcp',
    });

    expect(config.enabled).toBe(true);
    expect(config.allowedHosts).toEqual(['[::1]']);
  });
});
