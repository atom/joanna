'use strict'

const babylon = require('@babel/parser')

module.exports = function generate (code) {
  return new Generator(code).generate()
}

const BABYLON_OPTIONS = {
  sourceType: 'module',
  plugins: ['asyncFunctions', 'jsx']
}

const API_STATUS_REGEX = /^(Private|Public|Essential|Extended|Section):/

class Generator {
  constructor (code) {
    this.code = code
  }

  generate () {
    this.objects = {}
    this.exports = {}
    this.classStack = []
    this.nodeStack = []
    this.visit(babylon.parse(this.code, BABYLON_OPTIONS))
    return {
      objects: this.objects,
      exports: this.exports
    }
  }

  visit (node) {
    this.nodeStack.push(node)
    try {
      switch (node.type) {
        case 'ExportDefaultDeclaration': return this.visitExportDefaultDeclaration(node)
        case 'ExportNamedDeclaration': return this.visitExportNamedDeclaration(node)
        case 'AssignmentExpression': return this.visitAssignmentExpression(node)
        case 'FunctionDeclaration': return this.visitFunctionDeclaration(node)
        case 'FunctionExpression': return this.visitFunctionDeclaration(node)
        case 'ClassDeclaration': return this.visitClassDeclaration(node)
        case 'ClassExpression': return this.visitClassDeclaration(node)
        case 'ClassMethod': return this.visitMethodDefinition(node)
        default: return this.visitNodeWithChildren(node)
      }
    } finally {
      this.nodeStack.pop()
    }
  }

  visitExportDefaultDeclaration (node) {
    const declaredObject = this.visit(node.declaration)
    if (declaredObject) {
      declaredObject.bindingType = 'exports'
      declaredObject.doc = this.getDocumentation()
      this.exports = declaredObject.range[0][0]
    }
  }

  visitExportNamedDeclaration (node) {
    const declaredObject = this.visit(node.declaration)
    if (declaredObject) {
      this.expandObject(declaredObject, node.loc)
      declaredObject.doc = this.getDocumentation()
      declaredObject.bindingType = 'exportsProperty'
      this.exports[declaredObject.name] = declaredObject.range[0][0]
    }
  }

  visitAssignmentExpression (node) {
    const {left, right} = node
    if (left.type === 'MemberExpression') {
      const {object, property} = left
      if (object.type === 'Identifier') {
        switch (object.name) {
          case 'exports': {
            const rightObject = this.visit(right)
            if (rightObject) {
              this.expandObject(rightObject, node.loc)
              rightObject.doc = this.getDocumentation()
              rightObject.bindingType = 'exportsProperty'
              this.exports[rightObject.name] = rightObject.range[0][0]
            }
            break
          }

          case 'module': {
            const rightObject = this.visit(right)
            if (rightObject) {
              rightObject.bindingType = 'exports'
              rightObject.doc = this.getDocumentation()
              this.exports = rightObject.range[0][0]
            }
            break
          }
        }
      } else if (object.type === 'ThisExpression' && property.type === 'Identifier') {
        const doc = this.getDocumentation()
        if (doc && !doc.startsWith('Private:')) {
          const currentClass = last(this.classStack)
          const instanceProperty = this.addObject(node.loc, {
            name: property.name,
            type: 'primitive',
            bindingType: 'prototypeProperty',
            doc
          })
          currentClass.prototypeProperties.push(instanceProperty.range[0])
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
      doc: this.getDocumentation()
    }))
    this.visitNodeWithChildren(node)
    return this.classStack.pop()
  }

  visitMethodDefinition (node) {
    const currentClass = last(this.classStack)
    const currentMethod = this.addObject(node.loc, {
      type: 'function',
      name: node.key.name,
      doc: this.getDocumentation(),
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

    if (node.key.name === 'constructor') {
      this.visit(node.body)
    }

    return currentMethod
  }

  visitFunctionDeclaration (node) {
    return this.addObject(node.loc, {
      type: 'function',
      name: node.id && node.id.name,
      doc: this.getDocumentation(),
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

  getDocumentation () {
    const {start} = last(this.nodeStack).loc

    let leadingComments
    for (let i = this.nodeStack.length - 1; i >= 0; i--) {
      const node = this.nodeStack[i]
      if (node.loc.start.line < start.line || node.loc.start.column < start.column) break
      if (node.leadingComments) {
        leadingComments = node.leadingComments
        break
      }
    }
    if (!leadingComments) return

    let lastComment
    let groupedComments = []
    for (const comment of leadingComments) {
      if (lastComment && lastComment.loc.end.line === comment.loc.start.line - 1) {
        lastComment.value += '\n' + comment.value.replace(/^\s/, '')
        lastComment.loc.end = comment.loc.end
      } else {
        lastComment = {
          value: comment.value.replace(/^\s/, ''),
          loc: comment.loc
        }
        groupedComments.push(lastComment)
      }
    }

    // If there is a comment right before the node, return its content as
    // the documentation for that node.
    let result
    if (lastComment.loc.end.line === start.line - 1) {
      result = ensureAPIStatusTag(groupedComments.pop().value)
    }

    // Add any previous comments as separate top-level items
    for (const comment of groupedComments) {
      this.addObject(comment.loc, {
        type: 'comment',
        doc: comment.value.trim()
      })
    }

    return result
  }

  getLeadingComments () {
    let start = last(this.nodeStack).loc.start
    for (let i = this.nodeStack.length - 1; i >= 0; i--) {
      let node = this.nodeStack[i]
      if (node.loc.start.line < start.line || node.loc.start.column < start.column) {
        break
      }
      if (node.leadingComments) {
        return node.leadingComments
      }
    }
    return null
  }

  expandObject (object, newLocation) {
    delete this.objects[object.range[0][0]][object.range[0][1]]
    object.range = this.getRange(newLocation)
    this.objects[object.range[0][0]][object.range[0][1]] = object
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
