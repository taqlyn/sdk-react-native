import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const sampleRoot = join(import.meta.dir, '..', 'sample')

/** Vendor / Hybrid strings that must not appear in sample app source. */
const FORBIDDEN = [
  /installreferrer/i,
  /com\.android\.installreferrer/,
  /UIPasteboard/,
  /PlayInstallReferrer/,
  /HybridTaqlynSdk/,
  /createHybridObject/,
  /from ['"]react-native-nitro-modules['"]/,
  /require\(['"]react-native-nitro-modules['"]\)/,
]

function walk(dir: string, acc: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return acc
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(p)
  }
  return acc
}

describe('sample / app sources must not import vendor / Nitro Hybrid types', () => {
  test('sample TS/JS avoids Install Referrer / pasteboard / Nitro Hybrid imports', () => {
    const files = walk(sampleRoot)
    expect(files.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const needle of FORBIDDEN) {
        if (needle.test(text)) {
          offenders.push(`${file}: matches ${needle}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
