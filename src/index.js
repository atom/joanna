'use strict'

const fs = require('fs')
const path = require('path')
const generate = require('./generate')

function run (filePaths) {
  const result = {files: {}}
  for (let filePath of filePaths) {
    try {
      const absoluteFilePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath)
      const code = fs.readFileSync(absoluteFilePath, 'utf8')
      result.files[filePath] = generate(code)
    } catch (e) {
      console.error('Error: processing joanna docs for file ' + filePath)
      throw e
    }
  }
  return result
}

run.generate = generate

module.exports = run
