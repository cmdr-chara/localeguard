export type JSONPrimitive = string | number | boolean | null
export type JSONValue = JSONPrimitive | JSONObject | JSONArray

export interface JSONObject {
  readonly [key: string]: JSONValue
}

export type JSONArray = readonly JSONValue[]

export type Severity = 'critical' | 'warning' | 'info'

export type Category =
  | 'missing-key'
  | 'extra-key'
  | 'type-mismatch'
  | 'array-length'
  | 'icu-placeholders'
  | 'mustache-placeholders'
  | 'printf-placeholders'
  | 'html-tags'
  | 'escape-sequences'
  | 'deltarune-markers'

export interface Finding {
  readonly id: string
  readonly severity: Severity
  readonly category: Category
  readonly path: string
  /** Compact UI-friendly alias for `explanation`. */
  readonly message: string
  readonly explanation: string
  readonly expected: string
  readonly actual: string
  readonly remediation?: string
}

export interface ComparisonSummary {
  readonly total: number
  readonly critical: number
  readonly warning: number
  readonly info: number
}

export interface ComparisonResult {
  readonly findings: readonly Finding[]
  readonly score: number
  readonly summary: ComparisonSummary
}

export interface ParseLocaleJsonError {
  readonly code: 'invalid-json'
  readonly message: string
  readonly position?: number
}

export type ParseLocaleJsonResult =
  | { readonly ok: true; readonly value: JSONValue }
  | { readonly ok: false; readonly error: ParseLocaleJsonError }

type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
type TokenExtractor = (value: string) => readonly string[]

interface StringContract {
  readonly category: Exclude<Category, 'missing-key' | 'extra-key' | 'type-mismatch' | 'array-length'>
  readonly severity: Severity
  readonly label: string
  readonly extract: TokenExtractor
  readonly remediation: string
}

const stringContracts: readonly StringContract[] = [
  {
    category: 'icu-placeholders',
    severity: 'warning',
    label: 'ICU placeholder',
    extract: extractIcuPlaceholders,
    remediation: 'Keep ICU placeholder names and formatter kinds in the same order.',
  },
  {
    category: 'mustache-placeholders',
    severity: 'warning',
    label: 'Mustache placeholder',
    extract: extractMustachePlaceholders,
    remediation: 'Keep Mustache placeholders and section operators intact.',
  },
  {
    category: 'printf-placeholders',
    severity: 'warning',
    label: 'printf placeholder',
    extract: extractPrintfPlaceholders,
    remediation: 'Keep printf specifiers, including positional indexes, intact.',
  },
  {
    category: 'html-tags',
    severity: 'warning',
    label: 'HTML/XML tag',
    extract: extractHtmlTags,
    remediation: 'Keep markup tag nesting and closing tags intact.',
  },
  {
    category: 'escape-sequences',
    severity: 'warning',
    label: 'escape/control sequence',
    extract: extractEscapeSequences,
    remediation: 'Keep escaped and control sequences intact.',
  },
  {
    category: 'deltarune-markers',
    severity: 'critical',
    label: 'Deltarune/GameMaker marker',
    extract: extractDeltaruneMarkers,
    remediation: 'Preserve control markers exactly, including their order and repetition.',
  },
]

/** Parses a locale file without throwing, so UI callers can render parse errors directly. */
export function parseLocaleJson(text: string): ParseLocaleJsonResult {
  try {
    return { ok: true, value: JSON.parse(text) as JSONValue }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.'
    const position = parseErrorPosition(message)

    return {
      ok: false,
      error: {
        code: 'invalid-json',
        message,
        ...(position === undefined ? {} : { position }),
      },
    }
  }
}

/** Compares JSON structure and interpolation/control contracts, never translated prose. */
export function compareLocales(source: JSONValue, target: JSONValue): ComparisonResult {
  const findings: Finding[] = []
  compareValue(source, target, '$', findings)

  findings.sort(compareFindings)
  const summary = summarize(findings)

  return {
    findings,
    summary,
    score: scoreFor(summary),
  }
}

/** Extracts ICU variables and formatter kinds while deliberately ignoring Mustache forms. */
export function extractIcuPlaceholders(value: string): readonly string[] {
  const tokens: string[] = []

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '{' || value[index + 1] === '{') {
      continue
    }

    const end = findMatchingBrace(value, index)
    if (end === -1 || value[end + 1] === '}') {
      continue
    }

    const content = value.slice(index + 1, end).trim()
    const match = /^(?<name>[A-Za-z_][\w.-]*)(?:\s*,\s*(?<format>[A-Za-z_][\w-]*))?(?:\s*,|$)/.exec(content)
    if (match?.groups?.name) {
      const format = match.groups.format
      tokens.push(format ? `{${match.groups.name},${format}}` : `{${match.groups.name}}`)
    }

    index = end
  }

  return tokens
}

/** Extracts standard double/triple-brace Mustache tokens in source order. */
export function extractMustachePlaceholders(value: string): readonly string[] {
  const tokens: string[] = []
  const matcher = /{{{?\s*([#/^!>&]?\s*[A-Za-z_][\w.-]*(?:\s+[^{}]*?)?)\s*}?}}/g

  for (const match of value.matchAll(matcher)) {
    const raw = match[1]
    if (raw !== undefined) {
      tokens.push(`{{${raw.trim().replace(/\s+/g, ' ')}}}`)
    }
  }

  return tokens
}

/** Extracts printf conversion specifications but intentionally skips literal %% escapes. */
export function extractPrintfPlaceholders(value: string): readonly string[] {
  const tokens: string[] = []
  const matcher = /%(?!%)(?:\d+\$)?[-+ #0']*(?:\*|\d+)?(?:\.(?:\*|\d+))?(?:hh|h|ll|l|L|z|j|t)?[diuoxXfFeEgGaAcspn]/g

  for (const match of value.matchAll(matcher)) {
    tokens.push(match[0])
  }

  return tokens
}

/** Extracts opening, closing, and self-closing HTML/XML tags without comparing prose or attributes. */
export function extractHtmlTags(value: string): readonly string[] {
  const tokens: string[] = []
  const matcher = /<\s*(\/?)\s*([A-Za-z][\w:.-]*)(?:\s+[^<>]*?)?\s*(\/?)\s*>/g

  for (const match of value.matchAll(matcher)) {
    const closing = match[1] === '/'
    const name = match[2]
    const selfClosing = match[3] === '/'
    if (name !== undefined) {
      tokens.push(closing ? `</${name}>` : selfClosing ? `<${name}/>` : `<${name}>`)
    }
  }

  return tokens
}

/** Extracts literal escaped sequences and actual C0 control characters. */
export function extractEscapeSequences(value: string): readonly string[] {
  const positioned: Array<{ readonly index: number; readonly token: string }> = []
  const escapedMatcher = /\\(?:[\\"'nrtbfv0]|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4})/g

  for (const match of value.matchAll(escapedMatcher)) {
    if (match.index !== undefined) {
      positioned.push({ index: match.index, token: match[0] })
    }
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f) {
      positioned.push({ index, token: controlToken(code) })
    }
  }

  return positioned
    .sort((left, right) => left.index - right.index || compareText(left.token, right.token))
    .map(({ token }) => token)
}

/** Extracts compact and bracket GameMaker markers, preserving exact source order and repetition. */
export function extractDeltaruneMarkers(value: string): readonly string[] {
  const positioned: Array<{ readonly index: number; readonly token: string }> = []
  const controlMatcher = /\\(?:E(?:\[[^\]\r\n]+\]|[A-Za-z0-9])|c(?:\[[^\]\r\n]+\]|[A-Za-z0-9])|f(?:\[[^\]\r\n]+\]|[A-Za-z0-9])|s(?:\[[^\]\r\n]+\]|[A-Za-z0-9])|w\[[^\]\r\n]+\]|v\[[^\]\r\n]+\])|\^(?:\[[^\]\r\n]+\]|[1-9])|\/%/g
  const lineStartStarMatcher = /(?:^|[\n&])\s*(\*)/gm

  for (const match of value.matchAll(controlMatcher)) {
    const index = match.index
    if (index === undefined) {
      continue
    }
    positioned.push({ index, token: match[0] })
  }

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '&') {
      positioned.push({ index, token: '&' })
    }
  }

  for (const match of value.matchAll(lineStartStarMatcher)) {
    const index = match.index
    const star = match[1]
    if (index !== undefined && star !== undefined) {
      positioned.push({ index: index + match[0].lastIndexOf(star), token: star })
    }
  }

  return positioned
    .sort((left, right) => left.index - right.index || compareText(left.token, right.token))
    .map(({ token }) => token)
}

/** Renders a stable, human-readable signature that retains token order and multiplicity. */
export function markerSignature(tokens: readonly string[]): string {
  return tokens.length === 0 ? '(none)' : tokens.join(' → ')
}

function compareValue(source: JSONValue, target: JSONValue, path: string, findings: Finding[]): void {
  const sourceKind = jsonKind(source)
  const targetKind = jsonKind(target)

  if (sourceKind !== targetKind) {
    addFinding(findings, {
      category: 'type-mismatch',
      severity: 'critical',
      path,
      explanation: `Expected ${sourceKind} but found ${targetKind}.`,
      expected: sourceKind,
      actual: targetKind,
      remediation: 'Match the source JSON value type at this path.',
    })
    return
  }

  if (sourceKind === 'object') {
    compareObjects(source as JSONObject, target as JSONObject, path, findings)
    return
  }

  if (sourceKind === 'array') {
    compareArrays(source as JSONArray, target as JSONArray, path, findings)
    return
  }

  if (sourceKind === 'string') {
    compareStringContracts(source as string, target as string, path, findings)
  }
}

function compareObjects(source: JSONObject, target: JSONObject, path: string, findings: Finding[]): void {
  const sourceKeys = Object.keys(source).sort()
  const targetKeys = Object.keys(target).sort()
  const sourceKeySet = new Set(sourceKeys)
  const targetKeySet = new Set(targetKeys)

  for (const key of sourceKeys) {
    const childPath = propertyPath(path, key)
    if (!targetKeySet.has(key)) {
      addFinding(findings, {
        category: 'missing-key',
        severity: 'critical',
        path: childPath,
        explanation: 'Key exists in the source locale but is missing from the target locale.',
        expected: 'present',
        actual: 'missing',
        remediation: 'Add this key with a translation that preserves its contracts.',
      })
      continue
    }

    const sourceValue = source[key]
    const targetValue = target[key]
    if (sourceValue !== undefined && targetValue !== undefined) {
      compareValue(sourceValue, targetValue, childPath, findings)
    }
  }

  for (const key of targetKeys) {
    if (!sourceKeySet.has(key)) {
      addFinding(findings, {
        category: 'extra-key',
        severity: 'info',
        path: propertyPath(path, key),
        explanation: 'Key exists only in the target locale.',
        expected: 'absent',
        actual: 'present',
        remediation: 'Remove it or add the matching source key if it is intentional.',
      })
    }
  }
}

function compareArrays(source: JSONArray, target: JSONArray, path: string, findings: Finding[]): void {
  if (source.length !== target.length) {
    addFinding(findings, {
      category: 'array-length',
      severity: 'warning',
      path,
      explanation: 'Array lengths differ; shared indexes are still compared.',
      expected: String(source.length),
      actual: String(target.length),
      remediation: 'Match the source array length and ordering.',
    })
  }

  const sharedLength = Math.min(source.length, target.length)
  for (let index = 0; index < sharedLength; index += 1) {
    const sourceValue = source[index]
    const targetValue = target[index]
    if (sourceValue !== undefined && targetValue !== undefined) {
      compareValue(sourceValue, targetValue, `${path}[${index}]`, findings)
    }
  }
}

function compareStringContracts(source: string, target: string, path: string, findings: Finding[]): void {
  for (const contract of stringContracts) {
    const expectedTokens = contract.extract(source)
    const actualTokens = contract.extract(target)
    if (!sameTokens(expectedTokens, actualTokens)) {
      addFinding(findings, {
        category: contract.category,
        severity: contract.severity,
        path,
        explanation: `${contract.label} signature differs from the source.`,
        expected: markerSignature(expectedTokens),
        actual: markerSignature(actualTokens),
        remediation: contract.remediation,
      })
    }
  }
}

function addFinding(findings: Finding[], finding: Omit<Finding, 'id' | 'message'>): void {
  findings.push({
    ...finding,
    id: `localeguard:${finding.category}:${encodeURIComponent(finding.path)}`,
    message: finding.explanation,
  })
}

function compareFindings(left: Finding, right: Finding): number {
  return compareText(left.path, right.path) || compareText(left.category, right.category) || compareText(left.id, right.id)
}

function summarize(findings: readonly Finding[]): ComparisonSummary {
  let critical = 0
  let warning = 0
  let info = 0

  for (const finding of findings) {
    if (finding.severity === 'critical') critical += 1
    else if (finding.severity === 'warning') warning += 1
    else info += 1
  }

  return { total: findings.length, critical, warning, info }
}

function scoreFor(summary: ComparisonSummary): number {
  return Math.max(0, 100 - summary.critical * 25 - summary.warning * 10 - summary.info * 2)
}

function jsonKind(value: JSONValue): JsonKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as JsonKind
}

function propertyPath(parent: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`
}

function sameTokens(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((token, index) => token === right[index])
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function findMatchingBrace(value: string, start: number): number {
  let depth = 0
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1
    else if (value[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function parseErrorPosition(message: string): number | undefined {
  const match = /position (\d+)/i.exec(message)
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function controlToken(code: number): string {
  if (code === 10) return '\\n'
  if (code === 13) return '\\r'
  if (code === 9) return '\\t'
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`
}
