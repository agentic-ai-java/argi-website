/* eslint-disable no-console */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

const rootDir = process.cwd()
const failures = []

function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`)
    return ''
  }

  return readFileSync(absolutePath, 'utf8')
}

function collectFiles(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  if (!existsSync(absolutePath)) {
    return []
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = join(relativePath, entry.name)
    return entry.isDirectory() ? collectFiles(childPath) : [childPath]
  })
}

function requireText(relativePath, expected) {
  const source = readSource(relativePath)
  if (!source.includes(expected)) {
    failures.push(`${relativePath} must include: ${expected}`)
  }
}

const contentFiles = [
  'docusaurus.config.ts',
  'package.json',
  'project.config.ts',
  ...collectFiles('docs'),
  ...collectFiles('i18n'),
  ...collectFiles('src'),
].filter((relativePath) => ['.json', '.md', '.ts', '.tsx'].includes(extname(relativePath)))

const forbiddenPatterns = [
  { pattern: /\brefactor\b/giu, message: 'historical refactor wording' },
  { pattern: /Project Name/gu, message: 'template project placeholder' },
  { pattern: /dual-theme documentation website template/giu, message: 'template website description' },
  { pattern: /ContextCompressionHook/gu, message: 'nonexistent ContextCompressionHook API' },
  { pattern: /PostgresCheckpointSaver/gu, message: 'nonexistent PostgresCheckpointSaver API' },
  { pattern: /ParallelResearchNode/gu, message: 'undefined ParallelResearchNode example type' },
  { pattern: /ReflectionCriticNode/gu, message: 'undefined ReflectionCriticNode example type' },
  { pattern: /StateGraph<OverAllState>/gu, message: 'invalid generic StateGraph declaration' },
]

for (const relativePath of contentFiles) {
  const source = readSource(relativePath)
  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(source)) {
      failures.push(`${relativePath} contains ${message}`)
    }
    pattern.lastIndex = 0
  }
}

requireText('docs/versions.md', '`main` 分支当前开发版本')
requireText('docs/versions.md', '<groupId>io.github.agentic-ai</groupId>')
requireText('docs/versions.md', '<artifactId>argi-bom</artifactId>')
requireText('docs/frameworks/agent-framework/quick-start.md', 'io.github.agentic.ai.graph.agent.ReactAgent')
requireText('docs/frameworks/graph-core/quick-start.md', 'io.github.agentic.ai.graph.StateGraph')
requireText('src/pages/index.tsx', 'MemorySaver.builder().build()')
requireText('src/pages/index.tsx', 'ModelCallLimitHook.builder()')
requireText('project.config.ts', 'username: \'agentic-ai-java\'')
requireText('project.config.ts', 'repoName: \'argi\'')

if (failures.length > 0) {
  console.error('ARGI contract verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('ARGI contract verification passed.')
