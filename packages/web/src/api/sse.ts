/**
 * Incremental parser for a text/event-stream body. Feed it decoded chunks via
 * write(); it invokes onEvent once per complete event block.
 *
 * - Events are separated by a blank line; blocks split across arbitrary chunk
 *   boundaries are buffered until complete.
 * - A block may carry multiple `data:` lines (the server splits a payload's
 *   newlines across them); they are rejoined with '\n' to reconstruct the
 *   original text.
 * - Per the SSE spec, an unterminated final block is discarded, and blocks
 *   without an explicit `event:` field are ignored (the server always sets one).
 */
export function createSSEParser(onEvent: (event: string, data: string) => void): { write: (text: string) => void } {
  let buffer = '';

  const dispatch = (block: string) => {
    let event = '';
    const dataParts: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(line.startsWith('event: ') ? 7 : 6);
      } else if (line.startsWith('data:')) {
        dataParts.push(line.slice(line.startsWith('data: ') ? 6 : 5));
      }
    }
    if (event) onEvent(event, dataParts.join('\n'));
  };

  return {
    write(text: string): void {
      buffer += text;
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        if (block.trim()) dispatch(block);
      }
    },
  };
}
