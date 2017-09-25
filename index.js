'use strict'
var Obv = require('obv')
var HashTable = require('./hashtable')
var Drain = require('pull-stream/sinks/drain')
var AtomicFile = require('atomic-file/buffer')
var path = require('path')
var AsyncSingle = require('async-single')
//round up to the next power of 2
function nextPowerOf2 (n) {
  return Math.pow(2, Math.ceil(Math.log(n)/Math.LN2))
}

module.exports = function (version, hash, getKey, minSlots) {
  getKey = getKey || function (data) { return data.key }

  return function (log, name) {
    var since = Obv()
    var ht, buffer
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
      else if(value < _seq) throw new Error('seq decreased')
      _seq = value
    })

    function load (buffer) {
      //number of items / number of slots
      if(!buffer) return -1
      return buffer.readUInt32BE(12)/buffer.readUInt32BE(4)
    }

    state.get(function (err, _buffer) {
      //version, items, seq, count, hashtable...
      if('string' == typeof _buffer) throw new Error('expected buffer, found string')
      if(!_buffer)
        initialize(minSlots || 65536)
      //wrong version, rebuild
      else if (_buffer.readUInt32BE(0) != version)
        //rebuild with same number of slots
        rebuild(_buffer.readUInt32BE(4))

      //if hashtable is too full, rebuild
      else if(load(_buffer) > 0.5)
        //rebuild with double the number of slots
        rebuild(_buffer.readUInt32BE(4)*2)
      else {
        ht = HT((buffer = _buffer).slice(16))
        since.set(buffer.readUInt32BE(8)-1)
      }
    })

    function rebuild (target) {
      state.destroy(function () {
        initialize(target)
      })
    }

    function initialize (target) {
      buffer = new Buffer(16+target*4)
      buffer.fill(0)
      buffer.writeUInt32BE(version, 0)
      buffer.writeUInt32BE(target, 4)
      //everything after the header is the hashtable
      ht = HT(buffer.slice(16))
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
          // in the fairly unlikely case that
          // a write happens while we are saving the state
          // copy the state and write to a new buffer

          if(load(buffer) < 0.6) {
            ht.add(getKey(data.value), data.seq+1)
            //write seq
            buffer.writeUInt32BE(data.seq+1, 8)
            //write count
            buffer.writeUInt32BE(buffer.readUInt32BE(12)+1, 12)
            since.set(data.seq)
            async.write(buffer)
          } else {
            rebuilding = true
            //rebuild the database, which will set since to -1
            since.once(function (v) {
              cb()
            }, false)
            rebuild(buffer.readUInt32BE(4)*2)
            return false
          }

        }, function (err) {
          if(!rebuilding)
            cb(err !== true ? err : null)
        })
      },
      get: function (key, cb) {
        var called = false
        ht.get(key, function (err, value) {
          if(called) throw new Error('called already!')
          called = true
          cb(err, value)
        })
      },
      destroy: function (cb) {
        w.write(null, cb)
      },
      load: function () { return load(buffer) },
      _buffer: function () {return buffer},
      close: function (cb) { cb () }
    }
  }
}

