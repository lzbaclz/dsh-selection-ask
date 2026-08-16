#!/usr/bin/env node
/**
 * Dev-only type linking for dsh-selection-ask.
 *
 * The @deepseek-ai/* packages are NOT re-installable from the public npm
 * registry (pre-release), so we symlink the exact installed versions from the
 * web profile's flat node_modules into this repo's node_modules so both tsc
 * programs can typecheck against the real runtime. The symlinks are gitignored
 * (node_modules/) and never ship.
 *
 * The @deepseek-ai type graph is deep (ui-conversation transitively imports
 * primitives/attachment/connection, ui-input-trigger imports runtime/slots),
 * so instead of hand-curating a list that breaks on the next transitive add,
 * we link EVERY @deepseek-ai entry the profile exposes. Symlinks are cheap and
 * the extra packages are harmless (type-only, never bundled).
 *
 * Also runs `pnpm install` (idempotent) to fetch the public devDependencies
 * (typescript, tsdown, lightningcss, react, ...). pnpm runs FIRST so it never
 * prunes the manually created @deepseek-ai symlinks.
 *
 * Usage: `pnpm dev:types` (or `node scripts/link-types.mjs`).
 * Env override: DSH_PROFILE_NODE_MODULES=<dir> to point at another flat dir.
 */
import { mkdirSync, existsSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const profileFlat =
  process.env.DSH_PROFILE_NODE_MODULES ?? '/Users/liziqing/.dsh/profiles/node_modules'

// 1) Install public devDeps FIRST — pnpm manages node_modules and would prune
//    untracked entries created before it runs.
console.log('[link-types] running `pnpm install` for public devDeps…')
try {
  execSync('pnpm install', { cwd: root, stdio: 'inherit' })
} catch (error) {
  // Fall back to not auto-installing peer deps if the plain install tries to
  // fetch @deepseek-ai peers (they are symlinked below, not registry packages).
  console.warn('[link-types] plain `pnpm install` failed, retrying with auto-install-peers=false')
  execSync('pnpm install --config.auto-install-peers=false', { cwd: root, stdio: 'inherit' })
}

// 2) Symlink every @deepseek-ai package the profile exposes (idempotent).
const sourceDir = join(profileFlat, '@deepseek-ai')
const targetDir = join(root, 'node_modules', '@deepseek-ai')
mkdirSync(targetDir, { recursive: true })

if (!existsSync(sourceDir)) {
  console.warn(`[link-types] WARN: profile @deepseek-ai dir not found: ${sourceDir}`)
  process.exit(0)
}

let linked = 0
for (const pkg of readdirSync(sourceDir)) {
  const target = join(sourceDir, pkg)
  const link = join(targetDir, pkg)
  if (existsSync(link)) {
    rmSync(link, { recursive: true, force: true })
  }
  symlinkSync(target, link, 'dir')
  linked += 1
}
console.log(`[link-types] linked ${linked} @deepseek-ai packages -> ${sourceDir}`)
console.log('[link-types] done.')
