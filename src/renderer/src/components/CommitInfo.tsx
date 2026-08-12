import { useState, type JSX } from 'react'
import type { CommitMeta } from '../../../shared/types'
import { useMsg } from '../locale'
import { fmtDateTime, fmtDateTimeZone, useTimeZone } from '../timezone'

/**
 * The commit a repository session is showing, above its file list: subject,
 * author and date, then the message body in full. A snapshot has no diff, so
 * this is what the top-left pane says instead of nothing. A long body can be
 * folded away with the toggle in the meta row; the subject and author stay.
 */
export function CommitInfo({ meta }: { meta: CommitMeta }): JSX.Element {
  const { msg, locale } = useMsg()
  const tz = useTimeZone()
  const [collapsed, setCollapsed] = useState(true)
  const hasBody = meta.body.length > 0
  return (
    <div className="commit-info">
      <div className="commit-info-subject">{meta.subject}</div>
      <div className="commit-info-meta">
        <span className="commit-info-author">{meta.author}</span>
        <span className="commit-info-date" title={fmtDateTimeZone(meta.date, locale, tz)}>
          {fmtDateTime(meta.date, locale, tz)}
        </span>
        {hasBody && (
          <>
            <span className="spacer" />
            <button
              className="commit-info-toggle"
              title={msg.log.messageToggle(collapsed)}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? '▸' : '▾'}
            </button>
          </>
        )}
      </div>
      {hasBody && !collapsed && <pre className="commit-info-body">{meta.body}</pre>}
    </div>
  )
}
