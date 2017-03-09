'use strict'

var readsy = require('./')
var test = require('tape')
var from = require('from2')
var concat = require('concat-stream')
var pump = require('pump')

test('readsy wrap function, callback and stream', (t) => {
  t.plan(7)

  pump(readsy(() => from(['a', 'b', 'c'])), concat((buf) => {
    t.equal(buf.toString(), 'abc', 'wrap function')
  }), t.error)

  pump(readsy((cb) => {
    process.nextTick(() => cb(null, from(['a', 'b', 'c'])))
  }), concat((buf) => {
    t.equal(buf.toString(), 'abc', 'wrao callback')
  }), t.error)

  pump(readsy(from(['a', 'b', 'c'])), concat((buf) => {
    t.equal(buf.toString(), 'abc', 'wrao stream')
  }), t.error)

  t.throws(() => readsy(true), 'init must be a stream or function')
})

test('readsy init error', (t) => {
  t.plan(2)
  var reader = readsy.obj((cb) => {
    process.nextTick(() => cb(new Error('init error')))
  }, (cb) => {
    t.fail('should not flush on init error')
  })
  pump(reader, concat((cb) => cb()), (err) => {
    t.equal(err.message, 'init error')
    t.ok(reader.destroyed, 'stream destroyed')
  })
})
