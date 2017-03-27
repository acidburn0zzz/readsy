'use strict'

var eos = require('end-of-stream')
var util = require('util')
var fs = require('fs')
var stream = require('readable-stream')
var shift = require('stream-shift')

var isFn = (fn) => typeof fn === 'function'

var isStream = (stream) => stream && typeof stream === 'object' && isFn(stream.pipe)

var isFS = (stream) => fs && (stream instanceof fs.ReadStream || stream instanceof fs.WriteStream) && isFn(stream.close)

var isRequest = (stream) => stream.setHeader && isFn(stream.abort)

var toStreams2 = (rs) => (new stream.Readable({ objectMode: true, highWaterMark: 16 })).wrap(rs)

var destroy = (stream) => { // from pump destoryer
  if (isFS(stream)) return stream.close()
  if (isRequest(stream)) return stream.abort()
  if (isFn(stream.destroy)) return stream.destroy()
}

function Readsy (init, opts) {
  if (!(this instanceof Readsy)) return new Readsy(init, opts)
  this.destroyed = false

  this._drained = true
  this._forwarding = false

  if (isFn(init)) this._init = init
  else if (init && !opts) opts = init

  if (opts) {
    if (isFn(opts.init)) this._init = opts.init
    if (isFn(opts.chunk)) this._chunk = opts.chunk
  }

  stream.Readable.call(this, opts)

  var ready = (err, rs) => {
    this._rs = rs
    if (err) return this.destroy(err)
    if (this.destroyed) return destroy(this._rs)
    if (!this._rs) return
    eos(this._rs, (err) => this.destroy(err))

    this._rs2 = rs._readableState ? rs : toStreams2(rs)
    this._rs2.on('readable', () => this._forward())
    this._rs2.on('end', () => this.push(null))

    this._forward()
  }

  if (isFn(init)) {
    var rs = init(ready)
    if (isStream(rs)) ready(null, rs)
  } else if (isStream(init)) {
    ready(null, init)
  } else {
    throw new Error('init must be a stream or function')
  }
}

util.inherits(Readsy, stream.Readable)

Readsy.obj = function (init, opts) {
  if (init && !isFn(init)) opts = init
  else if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Readsy(init, opts)
}

Readsy.prototype._chunk = function (data) {
  return data
}

Readsy.prototype._read = function () {
  this._drained = true
  this._forward()
}

Readsy.prototype._forward = function () {
  if (this._forwarding || !this._rs2 || !this._drained) return
  this._forwarding = true

  var data
  while (this._drained && (data = this._chunk(shift(this._rs2))) !== null) {
    if (this.destroyed) continue
    this._drained = this.push(data)
  }
  this._forwarding = false
}

Readsy.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  process.nextTick(() => {
    if (err) this.emit('error', err)
    if (this._rs) destroy(this._rs)
    this.emit('close')
  })
}

module.exports = Readsy
