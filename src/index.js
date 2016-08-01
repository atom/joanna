'use strict'

const fs = require('fs')
const path = require('path')
const generate = require('./generate')
const findSources = require('./find-sources')

function run (directory) {
  const result = {files: {}}
  for (let filepath of findSources(directory)) {
    result.files[path.relative(directory, filepath)] = generate(fs.readFileSync(filepath, 'utf8'))
  }
  return result
}

run.generate = generate
run.findSources = findSources

module.exports = run
