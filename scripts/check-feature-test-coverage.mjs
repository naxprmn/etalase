import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const featurePrefix = 'src/features/'
const testsDir = join(repoRoot, 'tests')

// Map feature name to test file aliases in tests/ directory
const FEATURE_TEST_ALIASES = {
  'jurnal-filter': ['jurnal_filter.test.ts'],
  'jurnal-saya': ['jurnal_workspace.test.ts', 'delete_jurnal.test.ts', 'centralized_approval_workflow.test.ts'],
  'jurnal-sync': ['service_jurnal.test.ts', 'service_delivery.test.ts'],
  'lawet-auth': ['lawet_dashboard_boundary.test.ts'],
  'pimpinan-sync': ['service_pimpinan.test.ts'],
  'service-auth': ['service_auth.test.ts'],
  'service-events': ['service_delivery.test.ts'],
}

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean)
}

function featureNames(paths) {
  const names = new Set()
  for (const path of paths) {
    if (!path.startsWith(featurePrefix)) continue
    const name = path.slice(featurePrefix.length).split('/', 1)[0]
    if (name && !name.startsWith('_') && !name.includes('.')) names.add(name)
  }
  return names
}

function containsTest(directory) {
  if (!existsSync(directory)) return false
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory() && containsTest(path)) return true
    if (entry.isFile() && /\.test\.(?:ts|tsx)$/.test(entry.name)) return true
  }
  return false
}

export function hasFeatureTest(feature, root = repoRoot) {
  // 1. Check co-located test in src/features/<feature>
  const featureDir = join(root, featurePrefix, feature)
  if (containsTest(featureDir)) return true

  // 2. Check aliases in tests/
  const aliases = FEATURE_TEST_ALIASES[feature] || []
  for (const alias of aliases) {
    if (existsSync(join(root, 'tests', alias))) return true
  }

  // 3. Check matching test filename in tests/ (e.g. tests/<feature>*.test.ts)
  const normalizedFeature = feature.replace(/-/g, '_')
  if (existsSync(join(root, 'tests'))) {
    for (const file of readdirSync(join(root, 'tests'))) {
      const lower = file.toLowerCase()
      if (lower.includes(feature.toLowerCase()) || lower.includes(normalizedFeature.toLowerCase())) {
        if (/\.test\.(?:ts|tsx)$/.test(file)) return true
      }
    }
  }

  return false
}

export function checkFeatureTestCoverage({ baseRevision, root = repoRoot, gitFn = git }) {
  const base = (baseRevision || '').trim()
  if (!base || /^0+$/.test(base)) {
    return { skipped: true, missing: [], message: 'Feature-test coverage gate skipped: no base revision.' }
  }

  const addedFiles = gitFn('diff', '--name-only', '--diff-filter=A', `${base}...HEAD`)
  const addedFeatures = featureNames(addedFiles)

  let baseFeatures = new Set()
  try {
    const treeFiles = gitFn('ls-tree', '-d', '-r', '--name-only', base, 'src/features')
    baseFeatures = featureNames(treeFiles)
  } catch {
    // If ls-tree fails on shallow clone or initial branch, treat all added as new
  }

  const newFeatures = [...addedFeatures].filter((feature) => !baseFeatures.has(feature)).sort()
  const missing = newFeatures.filter((feature) => !hasFeatureTest(feature, root))

  return {
    skipped: false,
    newFeatures,
    missing,
    message: missing.length
      ? `Feature-test coverage gate failed for: ${missing.join(', ')}`
      : 'Feature-test coverage gate passed.',
  }
}

// CLI entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const base = (process.argv[2] || process.env.BASE_SHA || '').trim()
  const result = checkFeatureTestCoverage({ baseRevision: base })

  if (result.skipped) {
    console.log(result.message)
    process.exit(0)
  }

  if (result.missing.length > 0) {
    console.error('Feature test coverage gate failed (TDD enforcement):')
    for (const feature of result.missing) {
      console.error(`- ${feature}: missing co-located test or tests/ file. New features require tests before implementation.`)
    }
    process.exit(1)
  }

  console.log(result.message)
}
