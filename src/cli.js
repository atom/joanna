#!/usr/bin/env node

'use strict'

const run = require('./index')
const arg = process.argv[2]
const output = run(arg)
console.log(JSON.stringify(output, null, 2))
