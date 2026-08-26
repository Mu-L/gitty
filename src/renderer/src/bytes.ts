/**
 * How a size in bytes is written wherever one is shown: the image preview's
 * footer, and the columns that would otherwise be blank because the file has
 * no line count — a binary file still has a size.
 *
 * Binary units, as a file manager writes them, with one decimal from a
 * kilobyte up: the column is narrow and the digit that matters is the first.
 * A leaf module with no imports, for the reason `paths.ts` is one.
 */
export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
