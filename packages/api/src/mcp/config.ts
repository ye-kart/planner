export interface McpConfig {
  enabled: boolean;
  resourceUrl: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  disabledReason?: string;
}

const LOCAL_RESOURCE_URL = 'http://localhost:3000/mcp';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function getMcpConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const configuredResource = env.PLANNER_MCP_RESOURCE_URL?.trim();
  if (!configuredResource && env.NODE_ENV === 'production') {
    return {
      enabled: false,
      resourceUrl: '',
      allowedHosts: LOCAL_HOSTS,
      allowedOrigins: LOCAL_HOSTS,
      disabledReason: 'PLANNER_MCP_RESOURCE_URL is required in production',
    };
  }

  const resourceUrl = configuredResource || LOCAL_RESOURCE_URL;
  let resource: URL;
  try {
    resource = new URL(resourceUrl);
  } catch {
    return disabled(resourceUrl, 'PLANNER_MCP_RESOURCE_URL must be an absolute URL');
  }

  const localHttp = resource.protocol === 'http:' && LOCAL_HOSTS.includes(resource.hostname);
  if (resource.protocol !== 'https:' && !localHttp) {
    return disabled(resourceUrl, 'PLANNER_MCP_RESOURCE_URL must use HTTPS outside localhost');
  }
  if (resource.pathname !== '/mcp' || resource.search || resource.hash || resource.username || resource.password) {
    return disabled(resourceUrl, 'PLANNER_MCP_RESOURCE_URL must be the canonical /mcp URL without credentials, query, or fragment');
  }

  const extraHosts = parseHostnameList(env.PLANNER_MCP_ALLOWED_HOSTS);
  const extraOrigins = parseHostnameList(env.PLANNER_MCP_ALLOWED_ORIGINS);

  return {
    enabled: true,
    resourceUrl: resource.toString(),
    allowedHosts: [...new Set([resource.hostname, ...extraHosts])],
    allowedOrigins: [...new Set([resource.hostname, ...extraOrigins])],
  };
}

function parseHostnameList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',')
    .map(item => item.trim().toLowerCase())
    .map(parseHostname)
    .filter((item): item is string => item !== undefined);
}

function parseHostname(value: string): string | undefined {
  if (!value) return undefined;
  if (value === '::1') return '[::1]';

  try {
    const parsed = new URL(`http://${value}`);
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return undefined;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function disabled(resourceUrl: string, disabledReason: string): McpConfig {
  return {
    enabled: false,
    resourceUrl,
    allowedHosts: LOCAL_HOSTS,
    allowedOrigins: LOCAL_HOSTS,
    disabledReason,
  };
}
