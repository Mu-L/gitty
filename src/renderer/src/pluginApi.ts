/**
 * The renderer end of `plugin:invoke` — the one channel every plugin shares,
 * and the only thing `window.gitty` grows however many there are. See
 * `ref/spec/plugins.md`.
 *
 * The cast is where the type safety of this call begins and ends: the caller
 * and the callee are halves of the same plugin, and its `shared.ts` is where
 * the two agree what a method takes and answers with.
 */
export async function invoke<T>(id: string, method: string, args: unknown[] = []): Promise<T> {
  return (await window.gitty.plugins.invoke(id, method, args)) as T
}
