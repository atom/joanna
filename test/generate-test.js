'use strict'

const CoffeeScript = require('coffee-script')
CoffeeScript.register()
const donna = require('donna')
const dedent = require('dedent')
const assert = require('chai').assert
const generate = require('../src/generate')

describe('generate(code)', function () {
  it('handles classes', function () {
    const donnaResult = runDonna(dedent`
      # A person class
      class Person extends Animal
        constructor: (name, age) ->
          @name = name
          @age = age

        # Get the name
        getName: -> @name
    `)

    const result = generate(dedent`
      // A person class
      class Person extends Animal {
        constructor (name, age) {
          this.name = name
          this.age = age
        }

        // Get the name
        getName () {
          return this.name
        }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])

    assert.deepEqual(result.objects['1']['0'], {
      type: 'class',
      name: 'Person',
      superClass: 'Animal',
      doc: 'Private: A person class',
      range: [[1, 0], [11, 1]],
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [
        [2, 2],
        [8, 2]
      ]
    })

    assert.deepEqual(result.objects['2']['2'], {
      type: 'function',
      name: 'constructor',
      doc: undefined,
      range: [[2, 2], [5, 3]],
      bindingType: 'prototypeProperty',
      paramNames: ['name', 'age']
    })

    assert.deepEqual(result.objects['8']['2'], {
      type: 'function',
      name: 'getName',
      doc: 'Private: Get the name',
      range: [[8, 2], [10, 3]],
      bindingType: 'prototypeProperty',
      paramNames: []
    })
  })

  it('handles section divider comments', function () {
    const donnaResult = runDonna(dedent`
      # A useful class
      class Person
        constructor: (name) ->
          @name = name

        ###
        Section: Getters
        ###

        ###
        Something else
        ###

        # Essential: Get the name
        # Does stuff
        # Returns a string.
        getName: -> @name
    `)

    const result = generate(dedent`
      // A useful class
      class Person {
        constructor (name) {
          this.name = name
        }

        /*
        Section: Getters
        */

        /*
        Something else
        */

        // Essential: Get the name
        // Does stuff
        // Returns a string.
        getName () { return this.name }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
    assertMatchingObjects(result, donnaResult, [6, 2], [5, 2])
    assertMatchingObjects(result, donnaResult, [10, 2], [9, 2])
  })

  it('handles top-level functions', function () {
    const donnaResult = runDonna(dedent`
      # A useful function
      hello = (one, two) ->
        console.log("hello!")
    `)

    const result = generate(dedent`
      // A useful function
      function hello (one, two) {
        console.log("hello!")
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 8])
  })

  it('handles exported functions', function () {
    const donnaResult = runDonna(dedent`
      # A useful function
      exports.hello = (one, two) ->
        console.log("hello!")
    `)

    const result = generate(dedent`
      // A useful function
      exports.hello = function hello (one, two) {
        console.log("hello!")
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
    assert.equal(result.exports.hello, 1)
    assert.equal(donnaResult.exports.hello, 1)
  })

  it('handles static methods', function () {
    const donnaResult = runDonna(dedent`
      # A useful class
      class Thing

        # A useful factory function
        @build: (id) ->
          new Thing(id)
    `)

    const result = generate(dedent`
      // A useful class
      class Thing {

        // A useful factory function
        static build (id) {
          return new Thing(id)
        }
      }
    `)

    assertMatchingObjects(result, donnaResult, [1, 0], [1, 0])
    assertMatchingObjects(result, donnaResult, [4, 2], [4, 10])
  })
})

function assertMatchingObjects (actualMetadata, expectedMetadata, actualPosition, expectedPosition) {
  const actualObjects = actualMetadata.objects
  const expectedObjects = expectedMetadata.objects

  assertMatchingObject(actualPosition, expectedPosition, [])

  function assertMatchingObject (actualPos, expectedPos, keyPath) {
    const actualObject = actualObjects[actualPos[0]][actualPos[1]]
    const expectedObject = expectedObjects[expectedPos[0]][expectedPos[1]]

    assert(expectedObject, 'No expected object at the given position')
    assert(actualObject, 'No actual object at the given position')

    const expectedKeys = Object.keys(expectedObject).sort()
    assert.deepEqual(Object.keys(actualObject).sort(), expectedKeys)

    for (let key of expectedKeys) {
      if (key === 'range') {
        continue
      } else if (key === 'doc') {
        const actualDoc = actualObject.doc && actualObject.doc.trim()
        const expectedDoc = expectedObject.doc && expectedObject.doc.trim()
        assertMatchingProperty(actualDoc, expectedDoc, keyPath.concat([key]))
      } else {
        assertMatchingProperty(actualObject[key], expectedObject[key], keyPath.concat([key]))
      }
    }
  }

  function assertMatchingProperty (actual, expected, keyPath) {
    if (Array.isArray(expected)) {
      assert.equal(actual.length, expected.length, 'Length of key path: ' + keyPath.join('.'))
      for (let i = 0; i < expected.length; i++) {
        let expectedElement = expected[i]
        let actualElement = actual[i]
        if (isPosition(expectedElement)) {
          assertMatchingObject(actualElement, expectedElement, keyPath.concat([i]))
        } else {
          assert.equal(actualElement, expectedElement, 'Key path: ' + keyPath.join('.') + i)
        }
      }
    } else {
      assert.equal(actual, expected, 'Key path: ' + keyPath.join('.'))
    }
  }
}

function isPosition (value) {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
}

function runDonna (content) {
  const filename = 'test.coffee'
  const parser = new donna.Parser()
  parser.parseContent(content, filename)
  const metadata = new donna.Metadata({}, parser)
  const slug = {files: {}}
  metadata.generate(CoffeeScript.nodes(content))
  donna.populateSlug(slug, filename, metadata)
  return slug.files[filename]
}
