export type Row = Record<string, string>

export function parseCSV(content: string): Row[] {
  const lines = content.trim().split('\n')
  if (lines.length === 0 || lines[0] === '') return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function toCSV(rows: Row[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const body = rows.map((r) => headers.map((h) => r[h] ?? '').join(',')).join('\n')
  return `${headers.join(',')}\n${body}`
}

export function toTable(rows: Row[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => (r[h] ?? '').length)))
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(' | ')
  const sep = widths.map((w) => '─'.repeat(w)).join('─┼─')
  return [fmt(headers), sep, ...rows.map((r) => fmt(headers.map((h) => r[h] ?? '')))].join('\n')
}
