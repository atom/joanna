'use strict'

const babylon = require('babylon')

module.exports = function generate (code) {
  return new Generator(code).generate()
}

const BABYLON_OPTIONS = {sourceType: 'module'}
const API_STATUS_REGEX = /^(Private|Essential|Extended|Section):/

class Generator {
  constructor (code) {
    this.code = code
  }

  generate () {
    this.objects = {}
    this.exports = {}
    this.classStack = []
    this.visit(babylon.parse(this.code, BABYLON_OPTIONS))
    return {
      objects: this.objects,
      exports: this.exports
    }
  }

  visit (node) {
    switch (node.type) {
      case 'AssignmentExpression': return this.visitAssignmentExpression(node)
      case 'FunctionDeclaration': return this.visitFunctionDeclaration(node)
      case 'FunctionExpression': return this.visitFunctionDeclaration(node)
      case 'ClassDeclaration': return this.visitClassDeclaration(node)
      case 'ClassMethod': return this.visitMethodDefinition(node)
      default: return this.visitNodeWithChildren(node)
    }
  }

  visitAssignmentExpression (node) {
    const left = node.left
    if (left.type === 'MemberExpression') {
      if (left.object.type === 'Identifier') {
        switch (left.object.name) {
          case 'exports':
          case 'module':
            const rightObject = this.visit(node.right)
            if (rightObject) {
              delete this.objects[rightObject.range[0][0]][rightObject.range[0][1]]
              rightObject.range = this.getRange(node.loc)
              rightObject.bindingType = 'exportsProperty'
              this.objects[rightObject.range[0][0]][rightObject.range[0][1]] = rightObject
              delete rightObject.doc
              delete rightObject.paramNames

              this.exports[rightObject.name] = rightObject.range[0][0]
            }
        }
      }
    }
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
    return this.classStack.pop()
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

    return currentMethod
  }

  visitFunctionDeclaration (node) {
    return this.addObject(node.loc, {
      type: 'function',
      name: node.id.name,
      doc: this.getDocumentation(node),
      paramNames: node.params.map(paramNode => paramNode.name),
      bindingType: 'variable'
    })
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
    const range = this.getRange(location)
    if (!this.objects[range[0][0]]) {
      this.objects[range[0][0]] = {}
    }
    return (this.objects[range[0][0]][range[0][1]] = Object.assign(object, {range: range}))
  }

  getRange (location) {
    const line = location.start.line - 1
    const column = location.start.column
    const endLine = location.end.line - 1
    const endColumn = location.end.column
    return [[line, column], [endLine, endColumn]]
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
