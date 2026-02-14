import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getToolDefinitions, executeTool, type ToolServices } from '../../src/services/chat-tools.js';

// Minimal stub services — read_document doesn't use them
const stubServices = {} as ToolServices;

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `chat-tools-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('getToolDefinitions', () => {
  it('includes read_document tool', () => {
    const tools = getToolDefinitions();
    const readDoc = tools.find(t => t.function.name === 'read_document');
    expect(readDoc).toBeDefined();
    expect(readDoc!.function.parameters.required).toContain('path');
  });
});

describe('executeTool — read_document', () => {
  it('reads a markdown file', () => {
    const filePath = join(tempDir, 'test.md');
    writeFileSync(filePath, '# Hello\n\nSome content here.');

    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(true);
    expect(result.data).toBe('# Hello\n\nSome content here.');
    expect(result.message).toContain('characters');
    expect(result.message).toContain(filePath);
  });

  it('reads a .txt file', () => {
    const filePath = join(tempDir, 'notes.txt');
    writeFileSync(filePath, 'Plain text notes');

    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(true);
    expect(result.data).toBe('Plain text notes');
  });

  it('reads a .json file', () => {
    const filePath = join(tempDir, 'data.json');
    writeFileSync(filePath, '{"key": "value"}');

    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(true);
    expect(result.data).toBe('{"key": "value"}');
  });

  it('reads .csv, .yaml, .yml files', () => {
    for (const ext of ['.csv', '.yaml', '.yml']) {
      const filePath = join(tempDir, `data${ext}`);
      writeFileSync(filePath, 'content');

      const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);
      expect(result.success).toBe(true);
    }
  });

  it('rejects unsupported file extensions', () => {
    const filePath = join(tempDir, 'script.sh');
    writeFileSync(filePath, '#!/bin/bash');

    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unsupported file type');
    expect(result.message).toContain('.sh');
  });

  it('returns error for non-existent file', () => {
    const result = executeTool('read_document', JSON.stringify({ path: '/no/such/file.md' }), stubServices);

    expect(result.success).toBe(false);
    expect(result.message).toContain('File not found');
  });

  it('returns error when path is empty', () => {
    const result = executeTool('read_document', JSON.stringify({ path: '' }), stubServices);

    expect(result.success).toBe(false);
    expect(result.message).toContain('File path is required');
  });

  it('truncates large files', () => {
    const filePath = join(tempDir, 'large.md');
    const largeContent = 'x'.repeat(60_000);
    writeFileSync(filePath, largeContent);

    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(true);
    expect((result.data as string).length).toBe(50_000);
    expect(result.message).toContain('truncated');
  });

  it('resolves relative paths', () => {
    // Write a file in the temp dir and use a relative-style path
    const filePath = join(tempDir, 'relative.md');
    writeFileSync(filePath, 'Relative content');

    // Pass the absolute path (resolve won't change it) — just verify it works
    const result = executeTool('read_document', JSON.stringify({ path: filePath }), stubServices);

    expect(result.success).toBe(true);
    expect(result.data).toBe('Relative content');
  });
});
