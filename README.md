##### Atom and all repositories under Atom will be archived on December 15, 2022. Learn more in our [official announcement](https://github.blog/2022-06-08-sunsetting-atom/)
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
