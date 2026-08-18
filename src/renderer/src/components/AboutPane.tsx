import { useEffect, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { AboutInfo } from '../../../shared/types'

/**
 * Modal About dialog, drawn in the renderer like the settings pane — a native
 * message box's detail is plain text, and the project link has to be
 * clickable. Escape is handled by the App, which owns the open state, so this
 * component registers no key listeners of its own.
 */
export function AboutPane(props: {
  open: boolean
  onClose: () => void
  /** The title-bar icon, which is the app's as well. */
  appIcon: string | null
}): JSX.Element | null {
  const { msg, locale } = useMsg()
  const [info, setInfo] = useState<AboutInfo | null>(null)

  // Fetch the facts each time the dialog opens. They do not change under a
  // running app, but they cross IPC and belong in state like anything else.
  useEffect(() => {
    if (props.open) void window.gitty.about().then(setInfo)
  }, [props.open])

  if (!props.open) return null

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(e) => {
        // Clicking the backdrop (not the panel) closes the dialog.
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="about">
        <div className="settings-header">
          <span className="settings-title">{msg.app.about.title}</span>
          <button title={msg.app.about.close} onClick={props.onClose}>
            ×
          </button>
        </div>
        <div className="about-body">
          {props.appIcon && <img className="about-icon" src={props.appIcon} alt="" />}
          <div className="about-facts">
            {info && (
              <>
                <div>{msg.app.about.version(info.version)}</div>
                {info.builtAt && (
                  <div>{msg.app.about.builtAt(new Date(info.builtAt).toLocaleString(locale))}</div>
                )}
                {info.author && <div>{msg.app.about.author(info.author)}</div>}
                <div>{msg.app.about.electron(info.electron)}</div>
                <div>{msg.app.about.chromium(info.chromium)}</div>
                <div>{msg.app.about.node(info.node)}</div>
              </>
            )}
          </div>
          <a
            className="about-link"
            href={info?.github ?? '#'}
            onClick={(e) => {
              // The system browser is the app's browser; never navigate here.
              e.preventDefault()
              if (info) void window.gitty.file.openExternal(info.github)
            }}
          >
            {msg.app.about.github}
          </a>
        </div>
        <div className="settings-footer">
          <button onClick={props.onClose}>{msg.app.about.close}</button>
        </div>
      </div>
    </div>
  )
}
