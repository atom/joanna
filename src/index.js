'use strict'

const fs = require('fs')
const path = require('path')
const generate = require('./generate')
const findSources = require('./find-sources')

module.exports = function (directory) {
  const result = {files: {}}
  for (let filepath of findSources(path.join(process.cwd(), directory))) {
    result.files[filepath] = generate(fs.readFileSync(filepath, 'utf8'))
  }
  return result
}
