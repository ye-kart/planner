export function formatOutput<T>(
  data: T,
  humanFormatter: (data: T) => string,
  options: { json?: boolean }
): string {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }
  return humanFormatter(data);
}
