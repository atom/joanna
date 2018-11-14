#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const tello = require('tello')
const joanna = require('./index')

const argv = require('yargs-parser')(process.argv.slice(2))
const pathArgs = argv._
const packageJsonPath = pathArgs.shift()
const outputPath = argv.o || argv.output

if (argv.help || argv.h || !packageJsonPath || pathArgs.length === 0) {
  console.log(
    'Usage: joanna-tello [-o <output-file>] <package-json-path> <source-path>...'
  )
  process.exit(0)
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

// The source paths can be directories, in which case we
// generate docs for all of the `.js` files in the directory.
const jsFiles = []
for (const pathArg of pathArgs) {
  if (fs.statSync(pathArg).isDirectory()) {
    for (const entry of fs.readdirSync(pathArg)) {
      if (entry.endsWith('.js')) {
        jsFiles.push(path.join(pathArg, entry))
      }
    }
  } else {
    jsFiles.push(pathArg)
  }
}

const jsMetadata = joanna(jsFiles)
const metadata = {
  repository: packageJson.repository.url,
  version: packageJson.version,
  files: jsMetadata.files
}

const api = tello.digest([metadata])
const output = JSON.stringify(api, null, 2)

if (outputPath) {
  fs.writeFileSync(outputPath, output)
} else {
  console.log(output)
}
