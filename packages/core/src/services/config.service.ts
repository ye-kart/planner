export interface ChatConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
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
}
