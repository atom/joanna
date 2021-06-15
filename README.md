# Joanna

[![CI](https://github.com/atom/joanna/actions/workflows/ci.yml/badge.svg)](https://github.com/atom/joanna/actions/workflows/ci.yml)

This is the JavaScript counterpart of [donna](https://github.com/atom/donna).

#### Usage

From node:

```js
const joanna = require('joanna')
const docsJSON = joanna([
  'src/some-file.js',
  'src/another-file.js'
])
```

From the command line:

```sh
$ joanna src/*.js
```

Or:

```sh
$ joanna-tello package.json src/*.js
```
