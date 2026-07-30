import { api } from './client';
import type {
  McpTokenCreateResponse,
  McpTokenListResponse,
  McpTokenScope,
} from './types';

export const mcpApi = {
  listTokens: (spaceId: string) =>
    api.get<McpTokenListResponse>(`/api/mcp/tokens?spaceId=${encodeURIComponent(spaceId)}`),
  createToken: (data: {
    name: string;
    spaceId: string;
    scopes: McpTokenScope[];
    expiresInDays: number;
  }) => api.post<McpTokenCreateResponse>('/api/mcp/tokens', data),
  revokeToken: (id: string) =>
    api.delete<{ ok: true }>(`/api/mcp/tokens/${encodeURIComponent(id)}`),
};
