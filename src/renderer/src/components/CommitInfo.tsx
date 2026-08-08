import type { JSX } from 'react'
import type { CommitMeta } from '../../../shared/types'
import { useMsg } from '../locale'

function fmtDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * The commit a repository session is showing, above its file list: subject,
 * author and date, then the message body in full. A snapshot has no diff, so
 * this is what the top-left pane says instead of nothing.
 */
export function CommitInfo({ meta }: { meta: CommitMeta }): JSX.Element {
  const { locale } = useMsg()
  return (
    <div className="commit-info">
      <div className="commit-info-subject">{meta.subject}</div>
      <div className="commit-info-meta">
        <span className="commit-info-author">{meta.author}</span>
        <span className="commit-info-date">{fmtDate(meta.date, locale)}</span>
      </div>
      {meta.body && <pre className="commit-info-body">{meta.body}</pre>}
    </div>
  )
}
