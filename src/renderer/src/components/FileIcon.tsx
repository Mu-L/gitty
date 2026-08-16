import { memo, type JSX } from 'react'
import { fileIcon, type IconShape } from '../icons'

/**
 * The eighteen glyphs `icons.ts` names, drawn once here. They are hand-written
 * paths on a 16-unit grid rather than an icon package: the tree draws one per
 * row on every repaint, and a dependency whose whole point is breadth would be
 * a megabyte to answer a question this file answers in a screenful.
 *
 * Everything strokes `currentColor` — the tone class on the `<svg>` sets it —
 * so a glyph costs nothing to re-theme and the light palette is not a second
 * copy of the table.
 */
/**
 * Half of Python's mark: the top bar and the leg under its left end. The other
 * half is the same path turned 180° about the centre — the two are exactly
 * complementary that way, so they interlock without overlapping and there is
 * one shape to keep right rather than two.
 */
const PY_HALF =
  'M5.4 2.2h5.2a2 2 0 0 1 2 2v1.2H7.2v3.6a1.6 1.6 0 0 1-1.6 1.6h-.6' +
  'a1.6 1.6 0 0 1-1.6-1.6V4.2a2 2 0 0 1 2-2z'

const SHAPES: Record<IconShape, JSX.Element> = {
  // < >
  code: (
    <>
      <polyline points="6 4 2.5 8 6 12" />
      <polyline points="10 4 13.5 8 10 12" />
    </>
  ),
  // The C family's preprocessor.
  hash: (
    <>
      <line x1="6" y1="3" x2="4.7" y2="13" />
      <line x1="11" y1="3" x2="9.7" y2="13" />
      <line x1="3.2" y1="6.3" x2="12.5" y2="6.3" />
      <line x1="2.8" y1="9.7" x2="12.1" y2="9.7" />
    </>
  ),
  // A cup, for the JVM.
  cup: (
    <>
      <path d="M3.5 4.5h7.5v4a3.75 3.75 0 0 1-7.5 0z" />
      <path d="M11 5.8h1.3a1.6 1.6 0 0 1 0 3.2H11" />
      <line x1="3" y1="13.5" x2="11.5" y2="13.5" />
    </>
  ),
  // { } — the pips at the waist are what keep them from reading as parentheses
  // at 13px, where the curve alone is too shallow to tell the two apart.
  braces: (
    <>
      <path d="M6.6 3.4c-1.5 0-1.3 3.2-2.4 4.6 1.1 1.4.9 4.6 2.4 4.6" />
      <line x1="4.2" y1="8" x2="3.1" y2="8" />
      <path d="M9.4 3.4c1.5 0 1.3 3.2 2.4 4.6-1.1 1.4-.9 4.6-2.4 4.6" />
      <line x1="11.8" y1="8" x2="12.9" y2="8" />
    </>
  ),
  // A tag, for the markup languages.
  markup: (
    <>
      <path d="M2 8l3.6-3.5H13.5v7H5.6z" />
      <circle cx="7.4" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A drop, for the stylesheets.
  style: <path d="M8 2.5c1.2 1.6 3.8 4.4 3.8 6.6a3.8 3.8 0 0 1-7.6 0C4.2 6.9 6.8 4.1 8 2.5z" />,
  // A page with lines on it.
  doc: (
    <>
      <path d="M4 2.5h5.2L12 5.3v8.2H4z" />
      <polyline points="9 2.5 9 5.5 12 5.5" />
      <line x1="5.8" y1="8" x2="10.2" y2="8" />
      <line x1="5.8" y1="10.5" x2="10.2" y2="10.5" />
    </>
  ),
  // Rows and columns.
  table: (
    <>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
      <line x1="2.5" y1="6.6" x2="13.5" y2="6.6" />
      <line x1="2.5" y1="9.6" x2="13.5" y2="9.6" />
      <line x1="6.5" y1="6.6" x2="6.5" y2="12.5" />
    </>
  ),
  image: (
    <>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
      <circle cx="6" cy="6.7" r="1.1" />
      <polyline points="3.2 11.6 6.6 8.6 9.2 10.8 11 9.2 13.3 11.3" />
    </>
  ),
  archive: (
    <>
      <rect x="2.5" y="3.2" width="11" height="3" rx="0.7" />
      <path d="M3.6 6.2v6.6h8.8V6.2" />
      <line x1="6.6" y1="9" x2="9.4" y2="9" />
    </>
  ),
  // >_ — a prompt.
  shell: (
    <>
      <polyline points="3 5 6.2 8 3 11" />
      <line x1="7.8" y1="11.4" x2="13" y2="11.4" />
    </>
  ),
  db: (
    <>
      <ellipse cx="8" cy="4.4" rx="4.8" ry="1.9" />
      <path d="M3.2 4.4v7.2c0 1 2.2 1.9 4.8 1.9s4.8-.9 4.8-1.9V4.4" />
      <path d="M3.2 8c0 1 2.2 1.9 4.8 1.9s4.8-.9 4.8-1.9" />
    </>
  ),
  lock: (
    <>
      <rect x="3.5" y="7" width="9" height="6.2" rx="1" />
      <path d="M5.8 7V5.4a2.2 2.2 0 0 1 4.4 0V7" />
    </>
  ),
  // A chip: compiled, nothing to read.
  binary: (
    <>
      <rect x="4" y="4" width="8" height="8" rx="1" />
      <rect x="6.6" y="6.6" width="2.8" height="2.8" rx="0.4" />
      <line x1="2" y1="6.5" x2="4" y2="6.5" />
      <line x1="2" y1="9.5" x2="4" y2="9.5" />
      <line x1="12" y1="6.5" x2="14" y2="6.5" />
      <line x1="12" y1="9.5" x2="14" y2="9.5" />
    </>
  ),
  media: (
    <>
      <circle cx="8" cy="8" r="5.3" />
      <path d="M6.8 5.7l3.6 2.3-3.6 2.3z" fill="currentColor" stroke="none" />
    </>
  ),
  // The letter the specimen sheets open with.
  font: (
    <>
      <polyline points="4 12.6 8 3.4 12 12.6" />
      <line x1="5.6" y1="9.4" x2="10.4" y2="9.4" />
    </>
  ),
  // A branch, for git's own files.
  git: (
    <>
      <circle cx="5" cy="4.4" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="11.4" cy="7.2" r="1.6" />
      <line x1="5" y1="6" x2="5" y2="10.4" />
      <path d="M11.4 8.8c0 2-2.6 1.8-4.8 2.6" />
    </>
  ),
  // Python, drawn as itself. The only glyph carrying colours of its own —
  // filled rather than stroked, and the two eyes white as the logo has them,
  // which reads on either theme because both sit on the mark's own blue and
  // yellow rather than on the pane.
  python: (
    <g stroke="none">
      <g fill="#ffd43b" transform="rotate(180 8 8)">
        <path d={PY_HALF} />
        <circle cx="5.4" cy="3.8" r="0.62" fill="#fff" />
      </g>
      <g fill="#4b8bbe">
        <path d={PY_HALF} />
        <circle cx="5.4" cy="3.8" r="0.62" fill="#fff" />
      </g>
    </g>
  ),
  // Unrecognised: a page, and nothing claimed about it.
  file: (
    <>
      <path d="M4 2.5h5.2L12 5.3v8.2H4z" />
      <polyline points="9 2.5 9 5.5 12 5.5" />
    </>
  )
}

/**
 * The icon for one file row. Memoised because the tree redraws whole: a
 * repository's file list is hundreds of rows and none of these glyphs changes
 * unless the path does.
 */
export const FileIcon = memo(function FileIcon({ path }: { path: string }): JSX.Element {
  const { shape, tone } = fileIcon(path)
  return (
    <svg
      className={`file-icon icon-${tone}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[shape]}
    </svg>
  )
})
