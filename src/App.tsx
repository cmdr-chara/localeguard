import {
  ArrowDown,
  ArrowRight,
  BracketsCurly,
  Check,
  DownloadSimple,
  FileArrowUp,
  FileCode,
  Funnel,
  LockKey,
  MagnifyingGlass,
  Play,
  ShieldCheck,
  Warning,
  X,
} from '@phosphor-icons/react'
import {
  type ChangeEvent,
  type DragEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { compareLocales, type Finding, type JSONValue } from './engine'
import { defaultFixture, fixtures, type LocaleFixture } from './fixtures/fixtures'

type SeverityFilter = 'all' | Finding['severity']

interface JsonErrorState {
  source?: string
  target?: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024

function parseEditorJson(text: string): { ok: true; value: JSONValue } | { ok: false; error: string } {
  if (!text.trim()) {
    return { ok: false, error: 'Add a JSON document before running preflight.' }
  }

  try {
    return { ok: true, value: JSON.parse(text) as JSONValue }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parsing error'
    return { ok: false, error: `Invalid JSON: ${message}` }
  }
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value || '(empty string)'
  if (value === undefined) return '(not present)'
  return JSON.stringify(value)
}

function scoreBand(score: number) {
  if (score >= 90) return { label: 'Ready', className: 'good' }
  if (score >= 70) return { label: 'Needs work', className: 'warning' }
  return { label: 'Release blocked', className: 'critical' }
}

function humanizeCategory(category: Finding['category']) {
  return category.replaceAll('-', ' ').replaceAll('_', ' ')
}

function createMarkdownReport(
  result: ReturnType<typeof compareLocales>,
  sourceName: string,
  targetName: string,
) {
  const status = scoreBand(result.score).label
  const rows = result.findings.length
    ? result.findings
        .map(
          (finding) =>
            `| ${finding.severity} | ${finding.category} | \`${finding.path}\` | ${finding.message.replaceAll('|', '\\|')} |`,
        )
        .join('\n')
    : '| info | none | `$` | No contract regressions detected. |'

  const details = result.findings
    .map(
      (finding) => `### ${finding.id}: ${finding.path}

- Severity: ${finding.severity}
- Category: ${finding.category}
- Expected: \`${formatValue(finding.expected).replaceAll('`', '\\`')}\`
- Actual: \`${formatValue(finding.actual).replaceAll('`', '\\`')}\`
${finding.remediation ? `- Remediation: ${finding.remediation}` : ''}`,
    )
    .join('\n\n')

  return `# LocaleGuard preflight report

- Source: ${sourceName}
- Target: ${targetName}
- Status: ${status}
- Score: ${result.score}/100
- Critical: ${result.summary.critical}
- Warnings: ${result.summary.warning}
- Informational: ${result.summary.info}

## Findings

| Severity | Category | JSON path | Explanation |
| --- | --- | --- | --- |
${rows}

${details}

Generated locally by LocaleGuard. File contents never left the browser.
`
}

function App() {
  const initialSource = parseEditorJson(defaultFixture.sourceText)
  const initialTarget = parseEditorJson(defaultFixture.targetText)
  const initialResult =
    initialSource.ok && initialTarget.ok ? compareLocales(initialSource.value, initialTarget.value) : null

  const [sourceText, setSourceText] = useState(defaultFixture.sourceText)
  const [targetText, setTargetText] = useState(defaultFixture.targetText)
  const [sourceName, setSourceName] = useState(defaultFixture.sourceName)
  const [targetName, setTargetName] = useState(defaultFixture.targetName)
  const [activeFixture, setActiveFixture] = useState<LocaleFixture['id'] | null>(defaultFixture.id)
  const [result, setResult] = useState(initialResult)
  const [jsonErrors, setJsonErrors] = useState<JsonErrorState>({})
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [dragTarget, setDragTarget] = useState<'source' | 'target' | null>(null)
  const loadingTimer = useRef<number | null>(null)
  const pendingErrorFocus = useRef<'source' | 'target' | null>(null)
  const sourceErrorRef = useRef<HTMLParagraphElement>(null)
  const targetErrorRef = useRef<HTMLParagraphElement>(null)

  useEffect(
    () => () => {
      if (loadingTimer.current !== null) window.clearTimeout(loadingTimer.current)
    },
    [],
  )

  useEffect(() => {
    const kind = pendingErrorFocus.current
    if (!kind || !jsonErrors[kind]) return

    const errorElement = kind === 'source' ? sourceErrorRef.current : targetErrorRef.current
    errorElement?.focus()
    pendingErrorFocus.current = null
  }, [jsonErrors])

  const filteredFindings = useMemo(() => {
    if (!result) return []
    const query = search.trim().toLocaleLowerCase()
    return result.findings.filter((finding) => {
      const severityMatch = filter === 'all' || finding.severity === filter
      const searchMatch =
        !query ||
        [finding.path, finding.message, finding.category, finding.remediation]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(query))
      return severityMatch && searchMatch
    })
  }, [filter, result, search])

  const invalidateResult = () => {
    if (loadingTimer.current !== null) {
      window.clearTimeout(loadingTimer.current)
      loadingTimer.current = null
    }
    setResult(null)
    setIsLoading(false)
    setIsDirty(true)
    setActiveFixture(null)
    setFilter('all')
    setSearch('')
  }

  const runComparison = (nextSource = sourceText, nextTarget = targetText) => {
    if (loadingTimer.current !== null) {
      window.clearTimeout(loadingTimer.current)
      loadingTimer.current = null
    }
    const source = parseEditorJson(nextSource)
    const target = parseEditorJson(nextTarget)
    const nextErrors: JsonErrorState = {}
    if (!source.ok) nextErrors.source = source.error
    if (!target.ok) nextErrors.target = target.error
    setJsonErrors(nextErrors)

    if (!source.ok || !target.ok) {
      pendingErrorFocus.current = !source.ok ? 'source' : 'target'
      setResult(null)
      setIsLoading(false)
      setIsDirty(true)
      return
    }

    pendingErrorFocus.current = null
    setResult(null)
    setIsLoading(true)
    loadingTimer.current = window.setTimeout(() => {
      setResult(compareLocales(source.value, target.value))
      setIsLoading(false)
      setIsDirty(false)
      setFilter('all')
      setSearch('')
      loadingTimer.current = null
    }, 180)
  }

  const loadFixture = (fixture: LocaleFixture) => {
    setSourceText(fixture.sourceText)
    setTargetText(fixture.targetText)
    setSourceName(fixture.sourceName)
    setTargetName(fixture.targetName)
    setActiveFixture(fixture.id)
    setJsonErrors({})
    setIsDirty(false)
    runComparison(fixture.sourceText, fixture.targetText)
  }

  const onEditorChange = (kind: 'source' | 'target', value: string) => {
    if (kind === 'source') setSourceText(value)
    else setTargetText(value)
    invalidateResult()
    setJsonErrors((current) => ({ ...current, [kind]: undefined }))
  }

  const loadFile = async (kind: 'source' | 'target', file: File | undefined) => {
    if (!file) return
    if (!file.name.toLocaleLowerCase().endsWith('.json')) {
      setJsonErrors((current) => ({ ...current, [kind]: 'Choose a .json file.' }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setJsonErrors((current) => ({ ...current, [kind]: 'File is larger than the 5 MB browser safety limit.' }))
      return
    }

    const text = await file.text()
    if (kind === 'source') {
      setSourceText(text)
      setSourceName(file.name)
    } else {
      setTargetText(text)
      setTargetName(file.name)
    }
    invalidateResult()
    setJsonErrors((current) => ({ ...current, [kind]: undefined }))
  }

  const onFileInput = (kind: 'source' | 'target', event: ChangeEvent<HTMLInputElement>) => {
    void loadFile(kind, event.target.files?.[0])
    event.target.value = ''
  }

  const onDrop = (kind: 'source' | 'target', event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragTarget(null)
    void loadFile(kind, event.dataTransfer.files[0])
  }

  const downloadReport = () => {
    if (!result || isDirty || isLoading) return
    const report = createMarkdownReport(result, sourceName, targetName)
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'localeguard-preflight.md'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  const band = result
    ? scoreBand(result.score)
    : { label: isDirty ? 'Changes not analyzed' : 'Awaiting analysis', className: 'pending' }
  const previewFindings = result?.findings.slice(0, 3) ?? []

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workbench">
        Skip to comparison workbench
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="LocaleGuard home">
          <span className="brand-mark" aria-hidden="true">
            <BracketsCurly weight="bold" />
          </span>
          <span>LocaleGuard</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Compare</a>
          <a href="#report">QA report</a>
          <a href="#rules">Rules</a>
        </nav>
        <div className="local-proof">
          <LockKey aria-hidden="true" weight="bold" />
          <span>Runs locally</span>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="stage-label">
              <span>01</span>
              Input
            </div>
            <p className="eyebrow">Translation contract preflight</p>
            <h1 id="hero-title">Ship the copy. Keep the contract.</h1>
            <p className="hero-subtitle">
              Catch broken JSON structure, placeholders, markup, and control codes before release.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#workbench">
                Compare files <ArrowDown aria-hidden="true" weight="bold" />
              </a>
              <button className="button button-secondary" type="button" onClick={() => loadFixture(defaultFixture)}>
                <Play aria-hidden="true" weight="fill" /> Run broken demo
              </button>
            </div>
            <p className="privacy-line">
              <ShieldCheck aria-hidden="true" weight="bold" /> Files stay in this browser. No uploads. No telemetry.
            </p>
          </div>

          <section className="preflight-preview" aria-labelledby="preview-title">
            <div className="panel-heading">
              <div>
                <p>Live result</p>
                <h2 id="preview-title">Preflight snapshot</h2>
              </div>
              <span className={`status-label ${band.className}`}>{band.label}</span>
            </div>
            {isLoading ? (
              <div className="preview-loading" role="status">
                <span />
                <span />
                <span />
                Checking contracts locally
              </div>
            ) : result ? (
              <>
                <div className="score-row">
                  <div className={`score ${band.className}`}>
                    <strong>{result.score}</strong>
                    <span>quality score<br />out of 100</span>
                  </div>
                  <dl className="preview-totals">
                    <div><dt>Critical</dt><dd>{result.summary.critical}</dd></div>
                    <div><dt>Warnings</dt><dd>{result.summary.warning}</dd></div>
                    <div><dt>Info</dt><dd>{result.summary.info}</dd></div>
                  </dl>
                </div>
                <ol className="preview-list">
                  {previewFindings.map((finding) => (
                    <li key={finding.id}>
                      <span className={`severity-icon ${finding.severity}`} aria-hidden="true">
                        {finding.severity === 'critical' ? <X weight="bold" /> : <Warning weight="fill" />}
                      </span>
                      <span><strong>{finding.path}</strong><small>{finding.message}</small></span>
                      <em>{finding.severity}</em>
                    </li>
                  ))}
                </ol>
                <a className="report-link" href="#report">View full QA report <ArrowRight aria-hidden="true" /></a>
              </>
            ) : (
              <div className="preview-empty">
                {jsonErrors.source || jsonErrors.target
                  ? 'Fix the JSON errors below, then run preflight.'
                  : isDirty
                    ? 'Changes not analyzed. Run preflight to refresh the result.'
                    : 'Load two JSON documents and run preflight.'}
              </div>
            )}
          </section>
        </section>

        <section className="workbench" id="workbench" aria-labelledby="workbench-title">
          <div className="section-heading">
            <div className="stage-label"><span>02</span>Compare</div>
            <div>
              <h2 id="workbench-title">Inspect the contract, not just the copy.</h2>
              <p>Load two JSON locales, edit them in place, then run the same deterministic engine used by the report.</p>
            </div>
          </div>

          <div className="fixture-picker" role="group" aria-label="Built-in fixtures">
            {fixtures.map((fixture) => (
              <button
                className={activeFixture === fixture.id ? 'fixture-button active' : 'fixture-button'}
                key={fixture.id}
                onClick={() => loadFixture(fixture)}
                type="button"
                aria-pressed={activeFixture === fixture.id}
                title={fixture.description}
              >
                {fixture.id === 'valid' ? <Check aria-hidden="true" weight="bold" /> : fixture.id === 'control-codes' ? <BracketsCurly aria-hidden="true" /> : <X aria-hidden="true" weight="bold" />}
                <span>{fixture.shortLabel}<small>{fixture.label}</small></span>
              </button>
            ))}
          </div>

          <div className="editor-grid">
            <LocaleEditor
              kind="source"
              title="Source locale"
              fileName={sourceName}
              value={sourceText}
              error={jsonErrors.source}
              errorRef={sourceErrorRef}
              isDragging={dragTarget === 'source'}
              onChange={(value) => onEditorChange('source', value)}
              onInput={(event) => onFileInput('source', event)}
              onDragEnter={() => setDragTarget('source')}
              onDragLeave={() => setDragTarget(null)}
              onDrop={(event) => onDrop('source', event)}
            />
            <div className="contract-bridge" aria-hidden="true">
              <span>contract</span>
              <i />
              <i />
              <i />
            </div>
            <LocaleEditor
              kind="target"
              title="Target locale"
              fileName={targetName}
              value={targetText}
              error={jsonErrors.target}
              errorRef={targetErrorRef}
              isDragging={dragTarget === 'target'}
              onChange={(value) => onEditorChange('target', value)}
              onInput={(event) => onFileInput('target', event)}
              onDragEnter={() => setDragTarget('target')}
              onDragLeave={() => setDragTarget(null)}
              onDrop={(event) => onDrop('target', event)}
            />
          </div>

          <div className="analyze-bar">
            <p><LockKey aria-hidden="true" /> Parsed in memory. Nothing leaves this tab.</p>
            <button className="button button-primary analyze-button" type="button" onClick={() => runComparison()} disabled={isLoading}>
              <Funnel aria-hidden="true" weight="bold" />
              {isLoading ? 'Running preflight' : isDirty ? 'Analyze changes' : 'Analyze translation'}
            </button>
          </div>
        </section>

        <section className="report" id="report" aria-labelledby="report-title">
          <div className="report-topline">
            <div className="section-heading compact">
              <div className="stage-label"><span>03</span>Release</div>
              <div>
                <h2 id="report-title">QA report</h2>
                <p>{result ? `${result.summary.critical} release-blocking issue${result.summary.critical === 1 ? '' : 's'} found.` : isDirty ? 'Changes not analyzed.' : 'Run preflight to generate a report.'}</p>
              </div>
            </div>
            <button className="button button-secondary" type="button" onClick={downloadReport} disabled={!result || isDirty || isLoading}>
              <DownloadSimple aria-hidden="true" weight="bold" /> Export Markdown
            </button>
          </div>

          {result ? (
            <>
              <div className="metric-strip">
                <div className={`metric score-metric ${band.className}`}><span>Score</span><strong>{result.score}<small>/100</small></strong></div>
                <div className="metric"><span>Critical</span><strong>{result.summary.critical}</strong></div>
                <div className="metric"><span>Warnings</span><strong>{result.summary.warning}</strong></div>
                <div className="metric"><span>Informational</span><strong>{result.summary.info}</strong></div>
                <div className="metric"><span>Total findings</span><strong>{result.summary.total}</strong></div>
              </div>

              <div className="report-controls">
                <div className="filter-group" role="group" aria-label="Filter by severity">
                  {(['all', 'critical', 'warning', 'info'] as const).map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      className={filter === severity ? 'active' : ''}
                      onClick={() => setFilter(severity)}
                      aria-pressed={filter === severity}
                    >
                      {severity} <span>{severity === 'all' ? result.summary.total : result.summary[severity]}</span>
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <span className="sr-only">Search findings</span>
                  <MagnifyingGlass aria-hidden="true" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search paths or messages" />
                </label>
              </div>

              {result.findings.length === 0 ? (
                <div className="success-state" role="status">
                  <Check aria-hidden="true" weight="bold" />
                  <div><h3>Preflight passed</h3><p>No structural or marker regressions were detected.</p></div>
                </div>
              ) : filteredFindings.length === 0 ? (
                <div className="empty-state" role="status">
                  <MagnifyingGlass aria-hidden="true" />
                  <div><h3>No matching findings</h3><p>Clear the search or choose another severity.</p></div>
                </div>
              ) : (
                <div className="findings-list" aria-label="Preflight findings">
                  {filteredFindings.map((finding) => (
                    <FindingRow key={finding.id} finding={finding} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state report-empty">
              <FileCode aria-hidden="true" />
              <div>
                <h3>{isDirty ? 'Changes not analyzed' : 'No report yet'}</h3>
                <p>{jsonErrors.source || jsonErrors.target ? 'Fix the JSON errors, then run preflight.' : 'Run preflight to generate a fresh report.'}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rules" id="rules" aria-labelledby="rules-title">
          <div>
            <p className="eyebrow">Supported contracts</p>
            <h2 id="rules-title">One engine. Several failure modes.</h2>
            <p>LocaleGuard compares JSON structure and the technical tokens translators must preserve. It never judges prose quality.</p>
          </div>
          <ul>
            <li><strong>Structure</strong><span>Nested keys, arrays, primitive types, and null</span></li>
            <li><strong>Placeholders</strong><span>ICU, Mustache, and printf signatures</span></li>
            <li><strong>Markup</strong><span>HTML, XML, and escaped sequences</span></li>
            <li><strong>Game controls</strong><span>Compact and bracketed GameMaker-style markers</span></li>
          </ul>
        </section>
      </main>

      <footer>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><BracketsCurly weight="bold" /></span><span>LocaleGuard</span></div>
        <p>Open source, local-first localization preflight.</p>
      </footer>

      <div className="sr-only" aria-live="polite">
        {isLoading ? 'Locale comparison in progress.' : result ? `Comparison complete. ${result.summary.total} findings.` : isDirty ? 'Changes not analyzed.' : 'No comparison result.'}
      </div>
    </div>
  )
}

interface LocaleEditorProps {
  kind: 'source' | 'target'
  title: string
  fileName: string
  value: string
  error?: string
  errorRef: RefObject<HTMLParagraphElement | null>
  isDragging: boolean
  onChange: (value: string) => void
  onInput: (event: ChangeEvent<HTMLInputElement>) => void
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

function LocaleEditor({
  kind,
  title,
  fileName,
  value,
  error,
  errorRef,
  isDragging,
  onChange,
  onInput,
  onDragEnter,
  onDragLeave,
  onDrop,
}: LocaleEditorProps) {
  const inputId = `${kind}-file`
  const editorId = `${kind}-editor`
  return (
    <div
      className={`locale-editor ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); onDragEnter() }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) onDragLeave() }}
      onDrop={onDrop}
    >
      <div className="editor-heading">
        <div><span>{kind === 'source' ? 'SRC' : 'TGT'}</span><h3>{title}</h3><small>{fileName}</small></div>
        <label className="upload-button" htmlFor={inputId}>
          <FileArrowUp aria-hidden="true" weight="bold" /> Choose JSON
          <input id={inputId} type="file" accept="application/json,.json" onChange={onInput} />
        </label>
      </div>
      <label className="sr-only" htmlFor={editorId}>{title} JSON</label>
      <textarea
        id={editorId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${editorId}-error` : undefined}
      />
      {isDragging && <div className="drop-overlay"><FileArrowUp aria-hidden="true" /><strong>Drop {kind} JSON here</strong></div>}
      {error && <p ref={errorRef} className="json-error" id={`${editorId}-error`} role="alert" tabIndex={-1}><Warning aria-hidden="true" weight="fill" />{error}</p>}
    </div>
  )
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <details className={`finding-row ${finding.severity}`}>
      <summary>
        <span className="finding-severity">
          <span className="severity-icon" aria-hidden="true">
            {finding.severity === 'critical' ? <X weight="bold" /> : finding.severity === 'warning' ? <Warning weight="fill" /> : <FileCode weight="bold" />}
          </span>
          {finding.severity}
        </span>
        <span className="finding-path"><strong>{finding.path}</strong><small>{humanizeCategory(finding.category)}</small></span>
        <span className="finding-message">{finding.message}</span>
        <ArrowDown className="finding-chevron" aria-hidden="true" />
      </summary>
      <div className="finding-details">
        <div><span>Expected contract</span><code>{formatValue(finding.expected)}</code></div>
        <div><span>Actual contract</span><code>{formatValue(finding.actual)}</code></div>
        {finding.remediation && <p><strong>How to fix</strong>{finding.remediation}</p>}
      </div>
    </details>
  )
}

export default App
