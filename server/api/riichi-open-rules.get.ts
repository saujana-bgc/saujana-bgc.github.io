import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// The public Markdown file remains the source of truth. This endpoint lets the
// rules page render the complete guide into its prerendered HTML.
export default defineEventHandler(async () => {
  return readFile(resolve(process.cwd(), 'public/riichi-open/rules.md'), 'utf8')
})
