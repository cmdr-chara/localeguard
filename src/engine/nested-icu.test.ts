import { describe, expect, it } from 'vitest'
import { compareLocales, extractIcuPlaceholders } from './index'

describe('nested ICU contracts', () => {
  it('detects placeholders nested inside plural branches', () => {
    const source = '{count, plural, one {{name} has one item} other {{name} has # items}}'
    const target = '{count, plural, one {One item} other {# items}}'

    expect(extractIcuPlaceholders(source)).toEqual([
      '{count,plural}',
      '{name}',
      '{name}',
    ])
    expect(extractIcuPlaceholders(target)).toEqual(['{count,plural}'])
    expect(compareLocales({ message: source }, { message: target }).findings).toMatchObject([
      {
        category: 'icu-placeholders',
        severity: 'warning',
        path: '$.message',
      },
    ])
  })
})
