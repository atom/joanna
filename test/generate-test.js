'use strict'

const dedent = require('dedent')
const CoffeeScript = require('coffee-script')
CoffeeScript.register()
const donna = require('donna')
const assert = require('assert')
const generate = require('../src/generate')

describe('generate(code)', function () {
  it('handles classes', function () {
    const donnaResult = runDonna('test.coffee', dedent`
      # A person class
      class Person extends Animal
        constructor: (name) ->
          @name = name

        getName: -> @name
    `)

    const result = generate('test.js', dedent`
      // A person class
      class Person extends Animal {
        constructor (name, age) {
          this.name = name
          this.age = age
        }

        getName () {
          return this.name
        }
      }
    `)

    assert.deepEqual(result['1']['0'], {
      type: 'class',
      name: 'Person',
      superClass: 'Animal',
      doc: undefined,
      range: [[1, 0], [10, 1]],
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [
        [2, 2],
        [7, 2],
      ]
    })

    assert.deepEqual(result['2']['2'], {
      type: 'function',
      name: 'constructor',
      range: [[2, 2], [5, 3]],
      bindingType: 'prototypeProperty',
      paramNames: ['name', 'age']
    })

    assert.deepEqual(result['7']['2'], {
      type: 'function',
      name: 'getName',
      range: [[7, 2], [9, 3]],
      bindingType: 'prototypeProperty',
      paramNames: []
    })
  })
})

function runDonna (filename, content) {
  const parser = new donna.Parser()
  parser.parseContent(filename, content)
  const metadata = new donna.Metadata({}, parser)
  const slug = {files: {}}
  metadata.generate(CoffeeScript.nodes(content))
  donna.populateSlug(slug, filename, metadata)
  return slug.files[filename].objects
}
