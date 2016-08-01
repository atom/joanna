'use strict'

const fs = require('fs')
const path = require('path')
const walkdir = require('walkdir')
const SOURCE_PATHS = new Set(['src', 'lib', 'app'])
const NON_SOURCE_PATHS = new Set(['node_modules', '.git'])

module.exports = function findSources (rootPath) {
  return walkdir.sync(rootPath).filter(filepath => {
    if (!filepath.endsWith('.js')) {
      return false
    }

    if (!fs.statSync(filepath).isFile()) {
      return false
    }

    const segments = filepath.split(path.sep)

    let isSource = false
    for (let segment of segments) {
      if (NON_SOURCE_PATHS.has(segment)) {
        return false
      } else if (SOURCE_PATHS.has(segment)) {
        isSource = true
      }
    }

    return isSource
  })
}
