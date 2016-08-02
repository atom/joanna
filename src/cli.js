#!/usr/bin/env node

'use strict'

const run = require('./index')
const args = process.argv.slice(2)
const output = run(args)
console.log(JSON.stringify(output, null, 2))
