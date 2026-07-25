import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';
import {
  ConversationRepository, MessageRepository,
  ConfigService, ContextService,
  type AreaService, type GoalService, type TaskService, type HabitService,
  type SpaceService,
  generateId, ChatError,
  type Conversation, type Message,
} from '@planner/core';
import { getToolDefinitions, executeTool, type ToolServices } from './chat-tools.js';
import { buildSystemPrompt } from './chat-prompt.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall: (name: string, args: string) => void;
  onToolResult: (name: string, result: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class ChatService {
  private toolServices: ToolServices;
  private spaceName: string;

  constructor(
    private conversationRepo: ConversationRepository,
    private messageRepo: MessageRepository,
    private configService: ConfigService,
    private areaService: AreaService,
    private goalService: GoalService,
    private taskService: TaskService,
    private habitService: HabitService,
    private contextService: ContextService,
    spaceName: string,
    spaceService: SpaceService,
  ) {
    this.spaceName = spaceName;
    this.toolServices = {
      areaService,
      goalService,
      taskService,
      habitService,
      spaceService,
    };
  }

  isConfigured(): boolean {
    return this.configService.isChatConfigured();
  }

  listConversations(): Conversation[] {
    return this.conversationRepo.findAll();
  }

  createConversation(title: string = 'New chat'): Conversation {
    const now = new Date().toISOString();
    return this.conversationRepo.create({
      id: generateId(),
      title,
      createdAt: now,
      updatedAt: now,
    });
  }

  deleteConversation(id: string): void {
    this.conversationRepo.delete(id);
  }

  clearAllConversations(): void {
    for (const conv of this.conversationRepo.findAll()) {
      this.conversationRepo.delete(conv.id);
    }
  }

  getMessages(conversationId: string): Message[] {
    return this.messageRepo.findByConversationId(conversationId);
  }

  async sendMessage(
    conversationId: string,
    userMessage: string,
    currentScreen: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const config = this.configService.getChatConfig();
    if (!config) {
      callbacks.onError(new ChatError('AI not configured. Set PLANNER_AI_API_KEY environment variable.'));
      return;
    }

    // Persist user message
    const userPos = this.messageRepo.getMaxPosition(conversationId) + 1;
    this.messageRepo.create({
      id: generateId(),
      conversationId,
      role: 'user',
      content: userMessage,
      toolCallId: null,
      toolCalls: null,
      createdAt: new Date().toISOString(),
      position: userPos,
    });

    // Update conversation timestamp
    this.conversationRepo.update(conversationId, { updatedAt: new Date().toISOString() });

    // Build message array
    const systemPrompt = buildSystemPrompt(currentScreen, this.contextService, this.spaceName);
    const storedMessages = this.messageRepo.findByConversationId(conversationId);

    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of storedMessages) {
      if (msg.role === 'user') {
        apiMessages.push({ role: 'user', content: msg.content || '' });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls) {
          const toolCalls = JSON.parse(msg.toolCalls);
          apiMessages.push({ role: 'assistant', content: msg.content || null, tool_calls: toolCalls });
        } else {
          apiMessages.push({ role: 'assistant', content: msg.content || '' });
        }
      } else if (msg.role === 'tool') {
        apiMessages.push({ role: 'tool', content: msg.content || '', tool_call_id: msg.toolCallId || '' });
      }
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    try {
      await this.streamWithToolLoop(client, config.model, apiMessages, conversationId, callbacks);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError(new ChatError(`API error: ${err.message}`));
    }
  }

  private async streamWithToolLoop(
    client: OpenAI,
    model: string,
    apiMessages: ChatCompletionMessageParam[],
    conversationId: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const tools = getToolDefinitions();
    const MAX_TOOL_ROUNDS = 10;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await client.chat.completions.create({
        model,
        messages: apiMessages,
        tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
        stream: true,
      });

      let fullContent = '';
      const toolCallAccumulator: Map<number, { id: string; name: string; arguments: string }> = new Map();
      let hasToolCalls = false;

      for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Accumulate text content
        if (delta.content) {
          fullContent += delta.content;
          callbacks.onToken(delta.content);
        }

        // Accumulate tool calls
        if (delta.tool_calls) {
          hasToolCalls = true;
          for (const tc of delta.tool_calls) {
            const existing = toolCallAccumulator.get(tc.index);
            if (existing) {
              if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            } else {
              toolCallAccumulator.set(tc.index, {
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              });
            }
          }
        }
      }

      if (!hasToolCalls) {
        // Final text response — persist and complete
        const pos = this.messageRepo.getMaxPosition(conversationId) + 1;
        this.messageRepo.create({
          id: generateId(),
          conversationId,
          role: 'assistant',
          content: fullContent,
          toolCallId: null,
          toolCalls: null,
          createdAt: new Date().toISOString(),
          position: pos,
        });
        callbacks.onComplete(fullContent);
        return;
      }

      // Process tool calls
      const toolCallsArray = Array.from(toolCallAccumulator.values());
      const toolCallsForApi = toolCallsArray.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));

      // Persist assistant message with tool calls
      const assistantPos = this.messageRepo.getMaxPosition(conversationId) + 1;
      this.messageRepo.create({
        id: generateId(),
        conversationId,
        role: 'assistant',
        content: fullContent || null,
        toolCallId: null,
        toolCalls: JSON.stringify(toolCallsForApi),
        createdAt: new Date().toISOString(),
        position: assistantPos,
      });

      // Add assistant message to API messages
      apiMessages.push({
        role: 'assistant',
        content: fullContent || null,
        tool_calls: toolCallsForApi,
      });

      // Execute each tool call and persist results
      for (const tc of toolCallsArray) {
        callbacks.onToolCall(tc.name, tc.arguments);
        const result = executeTool(tc.name, tc.arguments, this.toolServices);
        const resultStr = JSON.stringify(result);
        callbacks.onToolResult(tc.name, result.message);

        const toolPos = this.messageRepo.getMaxPosition(conversationId) + 1;
        this.messageRepo.create({
          id: generateId(),
          conversationId,
          role: 'tool',
          content: resultStr,
          toolCallId: tc.id,
          toolCalls: null,
          createdAt: new Date().toISOString(),
          position: toolPos,
        });

        apiMessages.push({
          role: 'tool',
          content: resultStr,
          tool_call_id: tc.id,
        });
      }

      // The system prompt is deliberately NOT rebuilt here. Overwriting it with
      // post-mutation data made the model see its own writes as pre-existing
      // records — it would create a task, then read the refreshed dump and
      // report the task had "already been there". Leaving the snapshot pinned to
      // the start of the turn keeps cause and effect legible: the data predates
      // the tool calls, and the tool results carry every change made since.
      // Loop continues — model will process tool results and potentially call more tools
    }

    // If we exhaust rounds, complete with whatever we have
    callbacks.onComplete('(Reached maximum tool call rounds)');
  }
}
