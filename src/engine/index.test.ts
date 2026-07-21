import { describe, expect, it } from 'vitest'
import {
  compareLocales,
  extractDeltaruneMarkers,
  extractEscapeSequences,
  extractIcuPlaceholders,
  extractMustachePlaceholders,
  extractPrintfPlaceholders,
  markerSignature,
  parseLocaleJson,
  type JSONValue,
} from './index'

const categories = (source: JSONValue, target: JSONValue) =>
  compareLocales(source, target).findings.map((finding) => finding.category)

describe('parseLocaleJson', () => {
  it('returns structured invalid-JSON errors instead of throwing', () => {
    const result = parseLocaleJson('{"message": }')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-json')
      expect(result.error.message).toMatch(/json|unexpected|expected/i)
    }
  })

  it('accepts every valid JSON root type', () => {
    expect(parseLocaleJson('[true, null, 3, "text"]').ok).toBe(true)
  })
})

describe('compareLocales structure', () => {
  it('reports nested missing and extra keys with safe deterministic JSON paths', () => {
    const result = compareLocales(
      { section: { 'with space': 'Source', keep: 'Same contract' } },
      { section: { keep: 'Translated contract', added: 'Extra' } },
    )

    expect(result.findings).toMatchObject([
      {
        category: 'extra-key',
        path: '$.section.added',
        expected: 'absent',
        actual: 'present',
        id: 'localeguard:extra-key:%24.section.added',
      },
      {
        category: 'missing-key',
        path: '$.section["with space"]',
        expected: 'present',
        actual: 'missing',
      },
    ])
    expect(result.summary).toEqual({ total: 2, critical: 1, warning: 0, info: 1 })
    expect(result.score).toBe(73)
  })

  it('distinguishes arrays and null from other leaf types', () => {
    const result = compareLocales(
      { array: ['one'], nullable: null, number: 1, enabled: true },
      { array: { zero: 'one' }, nullable: [], number: '1', enabled: false },
    )

    expect(result.findings).toHaveLength(3)
    expect(result.findings.map((finding) => [finding.path, finding.expected, finding.actual])).toEqual([
      ['$.array', 'array', 'object'],
      ['$.nullable', 'null', 'array'],
      ['$.number', 'number', 'string'],
    ])
    expect(result.findings.every((finding) => finding.category === 'type-mismatch')).toBe(true)
  })

  it('reports array length differences and still compares shared indexes recursively', () => {
    const result = compareLocales(
      { lines: ['Hello %s', { name: '{{player}}' }, 'unused'] },
      { lines: ['Ciao %d', { name: '{{hero}}' }] },
    )

    expect(result.findings.map((finding) => [finding.path, finding.category])).toEqual([
      ['$.lines', 'array-length'],
      ['$.lines[0]', 'printf-placeholders'],
      ['$.lines[1].name', 'mustache-placeholders'],
    ])
  })
})

describe('string contracts', () => {
  it('checks ICU placeholders without mistaking Mustache braces for ICU', () => {
    const source = '{player} has {count, plural, one {# item} other {# items}}. {{rawValue}}'
    const target = '{hero} has {count, plural, one {# object} other {# objects}}. {{rawValue}}'
    const result = compareLocales({ message: source }, { message: target })

    expect(extractIcuPlaceholders(source)).toEqual(['{player}', '{count,plural}'])
    expect(extractMustachePlaceholders(source)).toEqual(['{{rawValue}}'])
    expect(categories({ message: source }, { message: target })).toEqual(['icu-placeholders'])
    expect(result.findings[0]).toMatchObject({
      expected: '{player} → {count,plural}',
      actual: '{hero} → {count,plural}',
    })
  })

  it('checks Mustache operators, printf placeholders, and ignores literal percent escapes', () => {
    const source = '{{#items}}%1$04d %% {{/items}} %s'
    const target = '{{#entries}}%s %% {{/entries}} %1$04d'
    const result = compareLocales({ message: source }, { message: target })

    expect(extractMustachePlaceholders(source)).toEqual(['{{#items}}', '{{/items}}'])
    expect(extractPrintfPlaceholders(source)).toEqual(['%1$04d', '%s'])
    expect(result.findings.map((finding) => finding.category)).toEqual([
      'mustache-placeholders',
      'printf-placeholders',
    ])
  })

  it('checks HTML/XML tags and escaped/control sequences in their original order', () => {
    const source = `<b class="loud">Hello</b><br/>${String.raw`\n`}Next${String.raw`\t`}`
    const target = `<b>Translated</b><br>${String.raw`\n`}Next`
    const result = compareLocales({ message: source }, { message: target })

    expect(extractEscapeSequences(source)).toEqual([String.raw`\n`, String.raw`\t`])
    expect(result.findings.map((finding) => finding.category)).toEqual(['escape-sequences', 'html-tags'])
  })

  it('preserves compact and bracket GameMaker forms, line markers, ordering, and multiplicity', () => {
    const compact = String.raw`\E3\EA\cY\c0\f0\s0^1^9/%&start
&next`
    const bracket = String.raw`\E[x]\c[y]\f[z]\s[q]\w[wait]\v[value]^[choice]`
    const source = `${compact}\n${bracket}\n*lead`
    const target = `${String.raw`\E3\E3\cY\c0\f0\s0^1^9/%&start
&next`}\n${bracket}\n*lead`
    const result = compareLocales({ message: source }, { message: target })

    expect(extractDeltaruneMarkers(source)).toEqual([
      String.raw`\E3`,
      String.raw`\EA`,
      String.raw`\cY`,
      String.raw`\c0`,
      String.raw`\f0`,
      String.raw`\s0`,
      '^1',
      '^9',
      '/%',
      '&',
      '&',
      String.raw`\E[x]`,
      String.raw`\c[y]`,
      String.raw`\f[z]`,
      String.raw`\s[q]`,
      String.raw`\w[wait]`,
      String.raw`\v[value]`,
      '^[choice]',
      '*',
    ])
    expect(markerSignature(extractDeltaruneMarkers(source))).toContain(`${String.raw`\E3`} → ${String.raw`\EA`}`)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      category: 'deltarune-markers',
      severity: 'critical',
      path: '$.message',
    })
  })

  it('preserves inline ampersand separators and logical line-start asterisks with spacing', () => {
    const source = '* root text&* next&  * spaced&&* again\n  * newline'
    const target = '* tradotto text&* next&  * spaced&* again\n  * newline'

    expect(extractDeltaruneMarkers(source)).toEqual(['*', '&', '*', '&', '*', '&', '&', '*', '*'])
    expect(compareLocales({ message: source }, { message: target }).findings).toMatchObject([
      { category: 'deltarune-markers', severity: 'critical', path: '$.message' },
    ])
  })
})

describe('clean locale contracts', () => {
  it('reports no findings when translated text changes but all contracts remain valid', () => {
    const source = {
      title: 'Hello {player} {{name}} %1$s <b>world</b> ' + String.raw`\E3\cY\c0\n`,
      choices: ['One ^1', 'Two ^2'],
      nullable: null,
    }
    const target = {
      title: 'Ciao {player} {{name}} %1$s <b>mondo</b> ' + String.raw`\E3\cY\c0\n`,
      choices: ['Uno ^1', 'Due ^2'],
      nullable: null,
    }

    expect(compareLocales(source, target)).toEqual({
      findings: [],
      summary: { total: 0, critical: 0, warning: 0, info: 0 },
      score: 100,
    })
  })
})
