'use strict'

const babylon = require('babylon')

module.exports = function generate (filename, code) {
  return new Generator(filename, code).generate()
}

const BABYLON_OPTIONS = {sourceType: 'module'}
const API_STATUS_REGEX = /^(Private|Essential|Extended|Section):/

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
      default: return this.visitNodeWithChildren(node)
    }
  }

  visitFunctionDeclaration (node) {
    this.addObject(node.loc, {
      type: 'function',
      name: node.id.name,
      bindingType: 'exportsProperty'
    })
  }

  visitClassDeclaration (node) {
    this.classStack.push(this.addObject(node.loc, {
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
    const currentClass = last(this.classStack)
    const currentMethod = this.addObject(node.loc, {
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
    if (!node.leadingComments) {
      return
    }

    let lastComment = null
    let groupedComments = []
    for (const comment of node.leadingComments) {
      if (lastComment && lastComment.loc.end.line === comment.loc.start.line - 1) {
        lastComment.value += '\n' + comment.value.trim()
        lastComment.loc.end = comment.loc.end
      } else {
        lastComment = {
          value: comment.value.trim(),
          loc: comment.loc
        }
        groupedComments.push(lastComment)
      }
    }

    // Add any previous comments as separate top-level items
    groupedComments.pop()
    for (const comment of groupedComments) {
      this.addObject(comment.loc, {
        type: 'comment',
        doc: comment.value
      })
    }

    return ensureAPIStatusTag(lastComment.value)
  }

  addObject (location, object) {
    const line = location.start.line - 1
    const column = location.start.column
    const endLine = location.end.line - 1
    const endColumn = location.end.column
    if (!this.result[line]) {
      this.result[line] = {}
    }
    return (this.result[line][column] = Object.assign(object, {
      range: [[line, column], [endLine, endColumn]]
    }))
  }
}

function ensureAPIStatusTag (text) {
  if (API_STATUS_REGEX.test(text)) {
    return text
  } else {
    return 'Private: ' + text
  }
}

function last (stack) {
  return stack[stack.length - 1]
}
