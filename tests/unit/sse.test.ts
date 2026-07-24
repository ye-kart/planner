import { describe, it, expect } from 'vitest';
import { createSSEParser } from '../../packages/web/src/api/sse';

function collect() {
  const events: Array<{ event: string; data: string }> = [];
  const parser = createSSEParser((event, data) => events.push({ event, data }));
  return { events, parser };
}

describe('createSSEParser', () => {
  it('parses a complete single event', () => {
    const { events, parser } = collect();
    parser.write('event: token\ndata: hello\n\n');
    expect(events).toEqual([{ event: 'token', data: 'hello' }]);
  });

  it('rejoins multi-line data blocks with newlines', () => {
    const { events, parser } = collect();
    parser.write('event: token\ndata: line one\ndata: line two\ndata: line three\n\n');
    expect(events).toEqual([{ event: 'token', data: 'line one\nline two\nline three' }]);
  });

  it('handles events split across arbitrary chunk boundaries', () => {
    const { events, parser } = collect();
    const stream = 'event: token\ndata: hel\ndata: lo\n\nevent: complete\ndata: done\n\n';
    // Feed one character at a time — the worst possible chunking.
    for (const ch of stream) parser.write(ch);
    expect(events).toEqual([
      { event: 'token', data: 'hel\nlo' },
      { event: 'complete', data: 'done' },
    ]);
  });

  it('handles multiple events in one chunk', () => {
    const { events, parser } = collect();
    parser.write('event: token\ndata: a\n\nevent: token\ndata: b\n\nevent: token\ndata: c\n\n');
    expect(events.map((e) => e.data)).toEqual(['a', 'b', 'c']);
  });

  it('accepts field names without the optional space', () => {
    const { events, parser } = collect();
    parser.write('event:token\ndata:no space\n\n');
    expect(events).toEqual([{ event: 'token', data: 'no space' }]);
  });

  it('discards an unterminated trailing block (SSE spec)', () => {
    const { events, parser } = collect();
    parser.write('event: token\ndata: complete\n\nevent: token\ndata: cut off mid-str');
    expect(events).toEqual([{ event: 'token', data: 'complete' }]);
  });

  it('preserves an empty data payload (blank streamed line)', () => {
    const { events, parser } = collect();
    parser.write('event: token\ndata: \ndata: after blank\n\n');
    expect(events).toEqual([{ event: 'token', data: '\nafter blank' }]);
  });

  it('ignores blocks without an event field', () => {
    const { events, parser } = collect();
    parser.write('data: orphan\n\nevent: token\ndata: real\n\n');
    expect(events).toEqual([{ event: 'token', data: 'real' }]);
  });
});
