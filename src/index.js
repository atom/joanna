'use strict'

const fs = require('fs')
const path = require('path')
const generate = require('./generate')

function run (filePaths) {
  const result = {files: {}}
  for (let filePath of filePaths) {
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)
    const code = fs.readFileSync(absoluteFilePath, 'utf8')
    result.files[filePath] = generate(code)
  }
  return result
}

run.generate = generate

module.exports = run
