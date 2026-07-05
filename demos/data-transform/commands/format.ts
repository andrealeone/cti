import { command } from 'concise-ti'
import { toCSV, toTable, type Row } from '../lib/formats'

export default command({
  meta: { description: 'Read JSON on stdin and render it as json|csv|table' },
  async run(ctx) {
    const target = ctx.positionals[0] ?? 'json'
    const input = await Bun.stdin.text()
    const parsed = JSON.parse(input)
    const rows: Row[] = Array.isArray(parsed) ? parsed : [parsed]

    if (target === 'json') ctx.io.write(JSON.stringify(parsed, null, 2))
    else if (target === 'csv') ctx.io.write(toCSV(rows))
    else if (target === 'table') ctx.io.write(toTable(rows))
    else {
      ctx.io.writeError(`Unknown format: ${target}`)
      return 1
    }
  },
})
