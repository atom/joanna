#!/usr/bin/env node

'use strict';

const tello = require('tello');
const joanna = require('./index');
const fs = require('fs');

// Generates API documentation in 'tello' format to stdout
// Usage: joanna-tello <package.json> <js-files>

const args = process.argv.slice(2);
const packageJsonPath = args[0];
args.shift();
const jsFiles = args;

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const jsMetadata = joanna(jsFiles);
const metadata = {
  repository: packageJson.repository.url,
  version: packageJson.version,
  files: jsMetadata.files
};

const api = tello.digest([metadata]);

console.log(JSON.stringify(api, null, 2));
