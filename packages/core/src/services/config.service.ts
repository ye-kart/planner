import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getConfigPath } from '../utils/paths.js';

export interface ChatConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface PlannerConfig {
  currentSpaceId?: string;
}

export class ConfigService {
  getChatConfig(): ChatConfig | null {
    const apiKey = process.env['PLANNER_AI_API_KEY'];
    if (!apiKey) return null;

    return {
      apiKey,
      baseUrl: process.env['PLANNER_AI_BASE_URL'] || 'https://api.openai.com/v1',
      model: process.env['PLANNER_AI_MODEL'] || 'gpt-4o',
    };
  }

  isChatConfigured(): boolean {
    return this.getChatConfig() !== null;
  }

  getCurrentSpaceId(): string | null {
    const config = this.readConfig();
    return config.currentSpaceId ?? null;
  }

  setCurrentSpaceId(spaceId: string): void {
    const config = this.readConfig();
    config.currentSpaceId = spaceId;
    this.writeConfig(config);
  }

  private readConfig(): PlannerConfig {
    const path = getConfigPath();
    if (!existsSync(path)) return {};
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return {};
    }
  }

  private writeConfig(config: PlannerConfig): void {
    const path = getConfigPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }
}
