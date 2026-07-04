/* eslint-disable no-console */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const failures = []

function requireFile(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    failures.push(`缺少文件：${relativePath}`)
  }
}

function requireDirectory(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    failures.push(`缺少目录：${relativePath}`)
    return false
  }

  return true
}

function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`缺少源码文件：${relativePath}`)
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
    const childRelativePath = join(relativePath, entry.name)
    if (entry.isDirectory()) {
      return collectFiles(childRelativePath)
    }

    return childRelativePath
  })
}

const searchBarSource = readSource('src/theme/SearchBar.tsx')
if (!searchBarSource.includes('PagefindSearch')) {
  failures.push('SearchBar.tsx 未接入 PagefindSearch 组件')
}

const rootSource = readSource('src/theme/Root.tsx')
if (rootSource.includes('PineconeFloatingSearch')) {
  failures.push('Root.tsx 仍在挂载 PineconeFloatingSearch mock 搜索')
}

const packageJson = JSON.parse(readSource('package.json'))
if (!packageJson.dependencies?.pagefind && !packageJson.devDependencies?.pagefind) {
  failures.push('package.json 未声明 pagefind 依赖')
}

if (!packageJson.scripts?.['index:search']) {
  failures.push('package.json 未声明 index:search 脚本')
}

if (requireDirectory('build/pagefind')) {
  requireFile('build/pagefind/pagefind-ui.js')
  requireFile('build/pagefind/pagefind-ui.css')
  requireFile('build/pagefind/pagefind.js')
  requireFile('build/pagefind/pagefind-entry.json')

  const pagefindFiles = collectFiles('build/pagefind')
  if (!pagefindFiles.some((filePath) => filePath.endsWith('.pf_index'))) {
    failures.push('build/pagefind 未生成 Pagefind 索引分片')
  }
  if (!pagefindFiles.some((filePath) => filePath.endsWith('.pf_fragment'))) {
    failures.push('build/pagefind 未生成 Pagefind 内容分片')
  }
}

if (failures.length > 0) {
  console.error('Pagefind 搜索验证失败：')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Pagefind 搜索验证通过。')
