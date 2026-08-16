#!/usr/bin/env node
/**
 * Offline smoke verification for dsh-selection-ask (no network, no DSH
 * instance). Covers:
 *
 *   1. manifest/exports/files consistency — every exported path exists;
 *   2. cordis.patch.yml parses and its first insert id/name match package name;
 *   3. lib/client.js starts with the window.__ModuleLoader__.load wrapper;
 *   4. no absolute machine paths (/Users/...) inside lib/;
 *   5. pure-logic assertions from lib/client/quote.js (buildQuote/appendQuote).
 *
 * Checks 3–5 depend on build artifacts (lib/) and report [skip] until
 * `pnpm build` has run; the manifest/patch checks always run.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
let failures = 0

function check(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`[verify] ${status} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

function skip(name) {
  console.log(`[verify] SKIP ${name}`)
}

// --- 1. manifest / exports / files consistency ------------------------------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const libBuilt = existsSync(join(root, 'lib'))

for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
  if (typeof target === 'string') {
    check(`export "${subpath}" resolves to an existing file`, existsSync(join(root, target)), target)
    continue
  }
  const def = target?.default
  const types = target?.types
  if (def) {
    if (def.replace(/^\.\//, '').startsWith('lib/') && !libBuilt) {
      skip(`export "${subpath}".default (lib/ not built yet)`)
    } else {
      check(`export "${subpath}".default exists`, existsSync(join(root, def)), def)
    }
  }
  if (types) {
    if (types.replace(/^\.\//, '').startsWith('lib/') && !libBuilt) {
      skip(`export "${subpath}".types (lib/ not built yet)`)
    } else {
      check(`export "${subpath}".types exists`, existsSync(join(root, types)), types)
    }
  }
}

const filesList = Array.isArray(pkg.files) ? pkg.files : []
for (const entry of filesList) {
  if (existsSync(join(root, entry))) {
    check(`files entry "${entry}" exists`, true, entry)
  } else if (entry === 'lib' && !libBuilt) {
    skip(`files entry "lib" (lib/ not built yet)`)
  } else {
    check(`files entry "${entry}" exists`, false, entry)
  }
}

check('dsh.bundle.patch points at an existing file', existsSync(join(root, pkg.dsh?.bundle?.patch ?? '')), pkg.dsh?.bundle?.patch)
check(
  'dsh.client declared with platform "web"',
  pkg.dsh?.client?.platform === 'web',
  `platform=${pkg.dsh?.client?.platform}`,
)
check('exports["./client"] declared', Boolean(pkg.exports?.['./client']), 'required by the roster scan')
check(
  'dsh.client.inject includes @deepseek-ai/dsh-client-ui-conversation',
  Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'),
  JSON.stringify(pkg.dsh?.client?.inject),
)

// --- 2. cordis.patch.yml -----------------------------------------------------
const patchPath = join(root, 'cordis.patch.yml')
const patchText = readFileSync(patchPath, 'utf8')
const insertBlock = /^\s*-\s*insert\s*:\s*$/m.test(patchText)
check('cordis.patch.yml is a top-level "insert" array', insertBlock)
const idMatch = /^\s*-\s*id\s*:\s*(.+?)\s*$/m.exec(patchText)
const nameMatch = /^\s*name\s*:\s*(.+?)\s*$/m.exec(patchText)
const firstId = idMatch?.[1]?.replace(/^['"]|['"]$/g, '')
const firstName = nameMatch?.[1]?.replace(/^['"]|['"]$/g, '')
check('patch first insert id matches package name', firstId === pkg.name, `id=${firstId}`)
check('patch first insert name matches package name', firstName === pkg.name, `name=${firstName}`)

// --- 3. bundle shape + purity -----------------------------------------------
// Platform module table: the ONLY specifiers the browser bundle may require at
// runtime. dsh-selection-ask value-imports only react/react-jsx-runtime; every
// @deepseek-ai/* import is type-only and erased by tsc.
const PLATFORM_EXTERNALS = new Set([
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
])
const clientBundle = join(root, 'lib', 'client.js')
if (existsSync(clientBundle)) {
  const text = readFileSync(clientBundle, 'utf8')
  const head = text.slice(0, 300)
  check(
    'lib/client.js starts with the module-loader wrapper',
    head.startsWith('window.__ModuleLoader__.load'),
    head.slice(0, 60).replace(/\s+/g, ' '),
  )
  check(
    'bundle wrapper id matches package name',
    head.includes(`id: "${pkg.name}"`),
    `id: "${pkg.name}"`,
  )
  check(
    'bundle wrapper footer present',
    text.replace(/\s+/g, ' ').includes('return module.exports; } });'),
    'return module.exports; } });',
  )
  const requires = [...text.matchAll(/require\((["'])([^"']+)\1\)/g)].map((m) => m[2])
  const purityOffenders = requires.filter((spec) => !PLATFORM_EXTERNALS.has(spec))
  check(
    'bundle requires only platform externals',
    purityOffenders.length === 0,
    purityOffenders.join(', ') || `${requires.length} require(s), all allowed`,
  )
} else {
  skip('bundle shape (lib/client.js not built yet)')
}

// --- 4. no absolute machine paths inside lib/ --------------------------------
const libDir = join(root, 'lib')
if (existsSync(libDir)) {
  const offenders = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (statSync(full).isFile() && /\.(js|mjs|cjs|map)$/.test(entry)) {
        const text = readFileSync(full, 'utf8')
        if (/\/Users\//.test(text)) offenders.push(relative(root, full))
      }
    }
  }
  walk(libDir)
  check('no /Users/ absolute paths inside lib/', offenders.length === 0, offenders.join(', '))
} else {
  skip('machine-path scan (lib/ not built yet)')
}

// --- 5. pure-logic assertions (lib/client/quote.js) --------------------------
const quoteJs = join(root, 'lib', 'client', 'quote.js')
if (existsSync(quoteJs)) {
  const { buildQuote, appendQuote } = await import(pathToFileURL(quoteJs).href)

  check('buildQuote prefixes every line with "> "', buildQuote('hello\nworld') === '> hello\n> world', JSON.stringify(buildQuote('hello\nworld')))
  check('buildQuote is identity for a single line', buildQuote('one') === '> one', JSON.stringify(buildQuote('one')))

  check('appendQuote replaces an empty draft', appendQuote('', '> hi') === '> hi', JSON.stringify(appendQuote('', '> hi')))
  check('appendQuote treats whitespace-only draft as empty', appendQuote('   ', '> hi') === '> hi', JSON.stringify(appendQuote('   ', '> hi')))
  check('appendQuote joins with a blank line', appendQuote('existing', '> hi') === 'existing\n\n> hi', JSON.stringify(appendQuote('existing', '> hi')))
} else {
  skip('pure-logic assertions (lib/client/quote.js not built yet)')
}

console.log(failures === 0 ? '\n[verify] all checks passed ✔' : `\n[verify] ${failures} check(s) FAILED ✘`)
process.exit(failures === 0 ? 0 : 1)
