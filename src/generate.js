'use strict'

const assert = require('assert')
const babylon = require('babylon')

module.exports = function generate (filename, code) {
  return new Generator(filename, code).generate()
}

const BABYLON_OPTIONS = {sourceType: 'module'}

class Generator {
  constructor (filename, code) {
    this.filename = filename
    this.code = code
  }

  generate () {
    this.result = {}
    this.classStack = []
    this.visit(babylon.parse(this.code, BABYLON_OPTIONS))
    return this.result
  }

  visit (node) {
    switch (node.type) {
      case 'FunctionDeclaration': return this.visitFunctionDeclaration(node)
      case 'ClassDeclaration': return this.visitClassDeclaration(node)
      case 'ClassMethod': return this.visitMethodDefinition(node)
      default:                 return this.visitNodeWithChildren(node)
    }
  }

  visitFunctionDeclaration (node) {
    this.addObject(node, {
      type: 'function',
      name: node.id.name,
      bindingType: 'exportsProperty',
    })
  }

  visitClassDeclaration (node) {
    this.classStack.push(this.addObject(node, {
      type: 'class',
      name: node.id.name,
      superClass: node.superClass && node.superClass.name,
      bindingType: undefined,
      classProperties: [],
      prototypeProperties: [],
      doc: this.getDocumentation(node)
    }))
    this.visitNodeWithChildren(node)
    this.classStack.pop()
  }

  visitMethodDefinition (node) {
    const currentClass = top(this.classStack)
    const currentMethod = this.addObject(node, {
      type: 'function',
      name: node.key.name,
      doc: this.getDocumentation(node),
      bindingType: node.static ? 'classProperty' : 'prototypeProperty',
      paramNames: node.params.map(paramNode => paramNode.name)
    })

    if (node.static) {
      currentMethod.bindingType = 'classProperty'
      currentClass.classProperties.push(currentMethod.range[0])
    } else {
      currentMethod.bindingType = 'prototypeProperty'
      currentClass.prototypeProperties.push(currentMethod.range[0])
    }
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

  getDocumentation (node) {
    if (node.leadingComments) {
      const lines = node.leadingComments.map(commentNode => commentNode.value)
      return 'Private:' + lines.join('\n') + ' '
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
