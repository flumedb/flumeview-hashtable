'use strict'
var Obv = require('obv')
var HashTable = require('./hashtable')
var Drain = require('pull-stream/sinks/drain')
var AtomicFile = require('atomic-file/buffer')
var path = require('path')
var AsyncSingle = require('async-single')
var Multi = require('./multi')
//round up to the next power of 2
function nextPowerOf2 (n) {
  return Math.pow(2, Math.ceil(Math.log(n)/Math.LN2))
}

module.exports = function (version, hash, getKey, minSlots) {
  getKey = getKey || function (data) { return data.key }

  return function (log, name) {
    var since = Obv()
    var ht, buffer, mt
    var filename = path.join(path.dirname(log.filename), name+'.ht')
    var state = AtomicFile(filename)

    var HT = HashTable(hash, function (data, key) {
      return key === getKey(data)
    }, function (offset, cb) {
      log.get(offset-1, cb)
    })

    var _seq
    since(function (value) {
      if(!_seq) _seq = value
      else if(value < _seq)
        console.error('seq decreased:'+value+', was:'+_seq)
      _seq = value
    })

    state.get(function (err, _buffer) {
      //version, items, seq, count, hashtable...
      if('string' == typeof _buffer) throw new Error('expected buffer, found string')

      //TODO: implement restoring for multitable.
      initialize(minSlots || 65536)
    })

    function rebuild (target) {
      state.destroy(function () {
        initialize(target)
      })
    }

    function initialize (target) {
      buffer = new Buffer(16+8+target*4)
      buffer.fill(0)
      buffer.writeUInt32BE(version, 0)
      buffer.writeUInt32BE(target, 4)
      //everything after the header is the hashtable

      //write the expected length into the buffer.
      buffer.writeUInt32BE(target, 16)
      ht = HT(buffer.slice(16))
      mt = Multi(HT, [ht])
      //sequence and items are already zero
      since.set(-1)
    }

    var async = AsyncSingle(function (value, cb) {
      if(state) {
        if(value) state.set(value, cb)
        else state.destroy(cb)
      } else cb()
    })

    return {
      methods: {get: 'async', load: 'sync'},
      since: since,
      createSink: function (cb) {
        var rebuilding = false
        return Drain(function (data) {

            mt.add(getKey(data.value), data.seq+1)
            //write seq
            //TODO: move counter etc into hashtable code
            buffer.writeUInt32BE(data.seq+1, 8)
            since.set(data.seq)
            async.write(buffer)

        }, function (err) {
          if(!rebuilding)
            cb(err !== true ? err : null)
        })
      },
      get: function (key, cb) {
        var called = false
        mt.get(key, function (err, value) {
          if(called) throw new Error('called already!')
          called = true
          cb(err, value)
        })
      },
      destroy: function (cb) {
        w.write(null, cb)
      },
      load: function () { return ht.load() },
      _buffer: function () {return buffer},
      close: function (cb) { cb () }
    }
  }
}


