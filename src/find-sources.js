'use strict'

const fs = require('fs')
const path = require('path')
const walkdir = require('walkdir')
const SOURCE_PATHS = new Set(['src', 'lib', 'app'])
const NON_SOURCE_PATHS = new Set(['node_modules', '.git'])

module.exports = function findSources (rootPath) {
  const result = []
  for (let filepath of walkdir.sync(rootPath)) {
    if (!filepath.endsWith('.js') || !fs.statSync(filepath).isFile()) {
      continue
    }

    const segments = filepath.split(path.sep)

    let isSource = false
    for (let segment of segments) {
      if (NON_SOURCE_PATHS.has(segment)) {
        isSource = false
        break
      } else if (SOURCE_PATHS.has(segment)) {
        isSource = true
      }
    }

    if (isSource) {
      result.push(filepath)
    }
  }

  return result
}
