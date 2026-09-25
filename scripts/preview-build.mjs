#!/usr/bin/env node

/* eslint-disable no-console */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname, '..')
const buildDir = resolve(rootDir, 'build')
const baseUrl = '/website/'
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3000)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
}

if (!existsSync(buildDir)) {
  console.error('Missing build directory. Run `npm run build` before `npm run preview`.')
  process.exit(1)
}

const toBuildPath = (requestUrl) => {
  const { pathname } = new URL(requestUrl, `http://${host}:${port}`)

  if (pathname === '/') {
    return { redirect: baseUrl }
  }

  if (!pathname.startsWith(baseUrl)) {
    return null
  }

  const strippedPath = decodeURIComponent(pathname.slice(baseUrl.length))
  const normalizedPath = normalize(strippedPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = resolve(buildDir, normalizedPath)

  if (candidate !== buildDir && !candidate.startsWith(`${buildDir}${sep}`)) {
    return null
  }

  if (existsSync(candidate)) {
    const stat = statSync(candidate)

    if (stat.isDirectory()) {
      return resolve(candidate, 'index.html')
    }

    return candidate
  }

  const htmlFile = resolve(buildDir, `${normalizedPath}.html`)
  if (existsSync(htmlFile)) {
    return htmlFile
  }

  const indexFile = resolve(buildDir, normalizedPath, 'index.html')
  if (existsSync(indexFile)) {
    return indexFile
  }

  return resolve(buildDir, 'index.html')
}

const server = createServer((request, response) => {
  const target = toBuildPath(request.url || baseUrl)

  if (target?.redirect) {
    response.writeHead(302, { Location: target.redirect })
    response.end()
    return
  }

  if (!target || !existsSync(target) || statSync(target).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(target)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(target).pipe(response)
})

server.listen(port, host, async () => {
  const buildEntries = await readdir(buildDir)
  console.log(`Serving ${buildEntries.length} build entries from ${buildDir}`)
  console.log(`Preview: http://${host}:${port}${baseUrl}`)
})
