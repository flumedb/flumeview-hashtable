var Obv = require('obv')
var HashTable = require('./hashtable')
var Drain = require('pull-stream/sinks/drain')
module.exports = function (version, hash, getKey) {
  getKey = getKey || function (data) { return data.key }

  return function (log, name) {
    var since = Obv()
    since.set(-1)
    var ht = HashTable(hash, function (data, key) {
      return key === getKey(data)
    }, function (offset, cb) {
      log.get(offset-1, cb)
    })(null, 200000)

    return {
      methods: {get: 'async'},
      since: since,
      createSink: function () {
        return Drain(function (data) {
          var k = ht.add(getKey(data.value), data.seq+1)
          since.set(data.seq)
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
      close: function (cb) { cb () }
    }
  }
}










