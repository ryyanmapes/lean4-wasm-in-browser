#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const [libDir, output, ...sourceRoots] = process.argv.slice(2)
if (!libDir || !output || sourceRoots.length === 0) {
  console.error('Usage: gen-visual-manifest.mjs <lean-lib> <output.json> <source-root>...')
  process.exit(2)
}

function visit(root, dir = root) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...visit(root, full))
    else if (entry.isFile() && entry.name.endsWith('.lean')) files.push({ root, full })
  }
  return files
}

function stripLeanComments(source) {
  let result = ''
  let blockDepth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    const next = source[i + 1]
    if (blockDepth > 0) {
      if (ch === '/' && next === '-') {
        blockDepth += 1
        result += '  '
        i += 1
      } else if (ch === '-' && next === '/') {
        blockDepth -= 1
        result += '  '
        i += 1
      } else {
        result += ch === '\n' || ch === '\r' ? ch : ' '
      }
      continue
    }
    if (!inString && ch === '/' && next === '-') {
      blockDepth = 1
      result += '  '
      i += 1
      continue
    }
    if (!inString && ch === '-' && next === '-') {
      while (i < source.length && source[i] !== '\n') {
        result += ' '
        i += 1
      }
      if (i < source.length) result += source[i]
      continue
    }
    result += ch
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') {
      inString = true
    }
  }
  return result
}

function importsOf(source) {
  const imports = []
  for (const line of stripLeanComments(source).split(/\r?\n/)) {
    const match = line.trim().match(/^(?:public\s+)?(?:meta\s+)?import\s+(\S+)/)
    if (match) imports.push(match[1])
  }
  return imports
}

const modules = {}
for (const sourceRoot of sourceRoots) {
  for (const { root, full } of visit(sourceRoot)) {
    const relative = path.relative(root, full).replaceAll('\\', '/')
    const moduleName = relative.replace(/\.lean$/, '').replaceAll('/', '.')
    const oleanPath = moduleName.replaceAll('.', '/') + '.olean'
    const installed = path.join(libDir, ...oleanPath.split('/'))
    if (!fs.existsSync(installed)) continue
    modules[moduleName] = {
      path: oleanPath,
      imports: importsOf(fs.readFileSync(full, 'utf8')),
      size: fs.statSync(installed).size,
    }
  }
}

fs.writeFileSync(output, JSON.stringify({
  version: '1.0',
  generated: new Date().toISOString(),
  modules,
}, null, 2) + '\n')

console.log(`Wrote ${Object.keys(modules).length} Visual Lean modules to ${output}`)
