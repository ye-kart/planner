import { describe, it, expect, beforeEach, vi } from 'vitest';

// Captures the `messages` array handed to the model on every round.
const rounds: Array<{ role: string; content: string }[]> = [];
let responses: Array<Record<string, unknown>[]> = [];

function asStream(chunks: Record<string, unknown>[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

// 'openai' is a dependency of @planner/ai and does not resolve from the repo
// root, so the mock has to name the path that does.
vi.mock('../../packages/ai/node_modules/openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async ({ messages }: { messages: { role: string; content: string }[] }) => {
          rounds.push(structuredClone(messages));
          return asStream(responses.shift() ?? []);
        },
      },
    };
  },
}));

const { ChatService } = await import('@planner/ai');

const TASK_TITLE = 'Make appointment to update passport';

let tasks: Array<{ id: string; title: string }>;

function buildService() {
  tasks = [{ id: 'old1', title: 'Change apartment locks' }];

  const stubs = {
    conversationRepo: { update: vi.fn() },
    messageRepo: {
      getMaxPosition: () => 0,
      create: vi.fn(),
      findByConversationId: () => [{ role: 'user', content: 'create the passport task', toolCalls: null, toolCallId: null }],
    },
    configService: { getChatConfig: () => ({ apiKey: 'k', baseUrl: 'http://stub', model: 'stub-model' }) },
    // contextService reads `tasks` live, so a mid-loop prompt rebuild would leak the new task.
    contextService: { today: () => ({}), all: () => ({ tasks }) },
    taskService: {
      add: (title: string) => {
        const task = { id: 'new1', title };
        tasks.push(task);
        return task;
      },
    },
  };

  return new ChatService(
    stubs.conversationRepo as never,
    stubs.messageRepo as never,
    stubs.configService as never,
    {} as never, // areaService
    {} as never, // goalService
    stubs.taskService as never,
    {} as never, // habitService
    stubs.contextService as never,
    'Personal',
    {} as never, // spaceService
  );
}

function noopCallbacks() {
  return {
    onToken: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  };
}

beforeEach(() => {
  rounds.length = 0;
  responses = [
    // Round 1: model calls create_task
    [{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'create_task', arguments: JSON.stringify({ title: TASK_TITLE }) } }] } }] }],
    // Round 2: model answers in plain text
    [{ choices: [{ delta: { content: 'Created it.' } }] }],
  ];
});

describe('chat system prompt across tool rounds', () => {
  // Regression: the loop used to overwrite apiMessages[0] with a freshly
  // serialised dataset after each tool round. The model then read its own
  // just-created task out of the "All Planning Data" dump and reported it as
  // having already existed.
  it('does not leak post-tool state back into the system prompt', async () => {
    const service = buildService();
    await service.sendMessage('conv1', 'create the passport task', 'dashboard', noopCallbacks());

    expect(rounds).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toContain(TASK_TITLE); // the tool really ran

    const secondRoundSystemPrompt = rounds[1][0].content;
    expect(secondRoundSystemPrompt).not.toContain(TASK_TITLE);
  });

  it('pins the snapshot — the system prompt is identical on every round', async () => {
    const service = buildService();
    await service.sendMessage('conv1', 'create the passport task', 'dashboard', noopCallbacks());

    expect(rounds[1][0].role).toBe('system');
    expect(rounds[1][0].content).toBe(rounds[0][0].content);
  });

  it('keeps the active space name after a tool round', async () => {
    const service = buildService();
    await service.sendMessage('conv1', 'create the passport task', 'dashboard', noopCallbacks());

    expect(rounds[1][0].content).toContain('Active space: "Personal"');
  });
});
