export interface LocaleFixture {
  id: 'broken' | 'valid' | 'deltarune'
  label: string
  shortLabel: string
  description: string
  sourceName: string
  targetName: string
  sourceText: string
  targetText: string
}

const format = (value: unknown) => JSON.stringify(value, null, 2)

const genericSource = {
  navigation: {
    home: 'Home',
    account: 'Account',
  },
  welcome: {
    title: 'Welcome back, {name}',
    subtitle: 'You have %d unread messages',
    badge: '{{tier}} member',
  },
  checkout: {
    confirm: 'Review <strong>{count}</strong> items',
    note: null,
    total: 42.5,
    enabled: true,
    instructions: 'Line one\nLine two',
  },
  items: [
    { id: 1, label: 'First item' },
    { id: 2, label: 'Second item' },
  ],
}

const genericBrokenTarget = {
  navigation: {
    home: 'Home',
    legacy: 'Old link',
  },
  welcome: {
    title: 'Bentornato, {nome}',
    subtitle: 'Hai %s messaggi non letti',
    badge: 'Membro {{livello}}',
  },
  checkout: {
    confirm: 'Controlla <strong>{count}</em> elementi',
    note: 'Nessuna nota',
    total: '42,50',
    enabled: true,
    instructions: 'Riga uno Riga due',
  },
  items: [{ id: 1, label: 'Primo elemento' }],
}

const genericValidTarget = {
  navigation: {
    home: 'Home',
    account: 'Account',
  },
  welcome: {
    title: 'Bentornato, {name}',
    subtitle: 'Hai %d messaggi non letti',
    badge: 'Membro {{tier}}',
  },
  checkout: {
    confirm: 'Controlla <strong>{count}</strong> elementi',
    note: null,
    total: 42.5,
    enabled: true,
    instructions: 'Riga uno\nRiga due',
  },
  items: [
    { id: 1, label: 'Primo elemento' },
    { id: 2, label: 'Secondo elemento' },
  ],
}

const syntheticDeltaruneSource = {
  face: '\\E3* System check^1&* Continue?/%',
  palette: '\\cYALERT\\c0',
  font: '\\f0Default',
  bracketed: '\\E[2]* Scan ^[1] /%',
  effects: '\\s[2]Fast \\w[1]Wave \\v[3]Vibe',
  nested: {
    lines: ['* First synthetic line/%', '&* Second synthetic line/%'],
  },
}

const syntheticDeltaruneBrokenTarget = {
  face: '\\E4 System check^2& Continue?',
  palette: '\\cRALERT\\c0',
  font: '\\f1Default',
  bracketed: '\\E[2]* Scan ^[2] /%',
  effects: '\\s[2]Fast \\v[3]Vibe \\w[1]Wave',
  nested: {
    lines: ['First synthetic line/%', '& Second synthetic line/%'],
  },
}

export const fixtures: LocaleFixture[] = [
  {
    id: 'broken',
    label: 'Generic broken translation',
    shortLabel: 'Broken demo',
    description: 'Missing keys, type drift, placeholder mutations, markup damage, and a shortened array.',
    sourceName: 'en-source.json',
    targetName: 'it-broken.json',
    sourceText: format(genericSource),
    targetText: format(genericBrokenTarget),
  },
  {
    id: 'valid',
    label: 'Completely valid translation',
    shortLabel: 'Valid fixture',
    description: 'The copy changes while every key, type, placeholder, tag, escape, and array slot remains valid.',
    sourceName: 'en-source.json',
    targetName: 'it-valid.json',
    sourceText: format(genericSource),
    targetText: format(genericValidTarget),
  },
  {
    id: 'deltarune',
    label: 'Synthetic Deltarune-style regression',
    shortLabel: 'Control-code demo',
    description: 'Original synthetic strings exercise compact and bracketed GameMaker-style control markers.',
    sourceName: 'synthetic-source.json',
    targetName: 'synthetic-broken.json',
    sourceText: format(syntheticDeltaruneSource),
    targetText: format(syntheticDeltaruneBrokenTarget),
  },
]

export const defaultFixture = fixtures[0]!
