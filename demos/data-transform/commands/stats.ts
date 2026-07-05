import { command } from 'concise-ti'
import { readFileSync } from 'node:fs'
import { parseCSV } from '../lib/formats'

export default command({
  meta: { description: 'Show statistics about a csv or json file' },
  run(ctx) {
    const file = ctx.positionals[0]
    if (!file) {
      ctx.io.writeError('Usage: transform stats <file>')
      return 1
    }
    const content = readFileSync(file, 'utf-8')
    if (file.endsWith('.csv')) {
      const rows = parseCSV(content)
      ctx.io.write(`Rows: ${rows.length}`)
      ctx.io.write(`Columns: ${rows.length > 0 ? Object.keys(rows[0]).length : 0}`)
    } else {
      const data = JSON.parse(content)
      ctx.io.write(`Type: ${Array.isArray(data) ? 'array' : 'object'}`)
      ctx.io.write(`Bytes: ${content.length}`)
    }
  },
})
