import { command } from 'concise-ti'
import { readFileSync } from 'node:fs'
import { parseCSV, toCSV, toTable, type Row } from '../lib/formats'

export default command({
  meta: { description: 'Convert a file between csv and json' },
  run(ctx) {
    const [from, to, file] = ctx.positionals
    if (!from || !to || !file) {
      ctx.io.writeError('Usage: transform convert <from> <to> <file>')
      return 1
    }
    const content = readFileSync(file, 'utf-8')
    const data = from === 'csv' ? parseCSV(content) : JSON.parse(content)
    const rows: Row[] = Array.isArray(data) ? data : [data]

    if (to === 'json') ctx.io.write(JSON.stringify(data, null, 2))
    else if (to === 'csv') ctx.io.write(toCSV(rows))
    else if (to === 'table') ctx.io.write(toTable(rows))
    else {
      ctx.io.writeError(`Unknown format: ${to}`)
      return 1
    }
  },
})
