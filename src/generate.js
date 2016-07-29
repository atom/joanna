'use strict'

const assert = require('assert')
const babylon = require('babylon')

module.exports = function generate (filename, code) {
  return new Generator(filename, code).generate()
}

class Generator {
  constructor (filename, code) {
    this.filename = filename
    this.code = code
  }

  generate () {
    this.result = {}
    this.classStack = []
    this.visit(babylon.parse(this.code))
    return this.result
  }

  visit (node) {
    switch (node.type) {
      case 'ClassDeclaration': return this.visitClassDeclaration(node)
      case 'ClassMethod': return this.visitMethodDefinition(node)
      default:                 return this.visitNodeWithChildren(node)
    }
  }

  visitClassDeclaration (node) {
    this.classStack.push(this.addObject(node, {
      type: 'class',
      name: node.id.name,
      superClass: node.superClass && node.superClass.name,
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [],
      doc: undefined
    }))

    this.visitNodeWithChildren(node)

    this.classStack.pop()
  }

  visitMethodDefinition (node) {
    const method = this.addObject(node, {
      type: 'function',
      name: node.key.name,
      bindingType: 'prototypeProperty',
      paramNames: node.params.map(paramNode => paramNode.name)
    })

    top(this.classStack).prototypeProperties.push(method.range[0])
  }

  visitNodeWithChildren (node) {
    for (let key of Object.keys(node)) {
      const value = node[key]
      if (Array.isArray(value)) {
        for (let element of value) {
          if (element && typeof element.type === 'string') {
            this.visit(element)
          }
        }
      } else if (value && typeof value.type === 'string') {
        this.visit(value)
      }
    }
  }

  addObject (node, object) {
    const line = node.loc.start.line - 1
    const column = node.loc.start.column
    const endLine = node.loc.end.line - 1
    const endColumn = node.loc.end.column
    if (!this.result[line]) {
      this.result[line] = {}
    }
    return this.result[line][column] = Object.assign(object, {
      range: [[line, column], [endLine, endColumn]]
    })
  }
}

function top (stack) {
  return stack[stack.length - 1]
}
