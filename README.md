# joanna [![Build Status](https://travis-ci.org/atom/joanna.svg?branch=master)](https://travis-ci.org/atom/joanna)

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
