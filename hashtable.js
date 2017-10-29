function NotFound (key) {
  var err = new Error('Not Found:'+key)
  err.notFound = true
  err.name = 'NotFoundError'
  return err
}

module.exports = function (hash, matches, get) {
  return function (buffer) {
    var size = 4, slots
    var self
    var count = 0
    var HEADER = 8 //[slots, count]

    if('number' === typeof buffer) {
      slots = buffer
      buffer = new Buffer(HEADER+buffer*size)
      buffer.fill(0)
      buffer.writeUInt32BE(slots, 0)
    }
    else {
      slots = (buffer.length-HEADER)/size
      var _slots = buffer.readUInt32BE(0)
      if(_slots != slots)
        throw new Error('mismatch number of slots, expected:'+_slots + ', got:'+slots)
      //XXX reads count, but doesn't use update it later!!!
      count = buffer.readUInt32BE(4)
    }

    function _get (i) {
      return buffer.readUInt32BE(HEADER + (i%slots)*size)
    }
    function _set (i, v) {
      buffer.writeUInt32BE(v, HEADER + (i%slots)*size)
    }

    return self = {
      count: count,
      slots: slots,
      get: function (key, cb) {
        ;(function next (i) {
          var k = _get(i)
          if(k === 0) {
            cb(NotFound(key))
          }
          else
            get(k, function (err, data) {
              if(err) cb(err)
              else if(matches(data, key)) {
                cb(null, data)
              }
              else next(i + 1)
            })
        })(hash(key))
      },
      _get: _get,
      add: function (key, index) {
        var i = hash(key)
        while(true) {
          var j = _get(i)
          if(j === 0) {
            _set(i, index)
            buffer.writeUInt32BE(self.count = ++count, 4)

            return true
          }
          else if(j === index)
            return false
          else
            i++
        }
      },
      buffer: buffer,
      load: function () {
        return count / slots
      }
    }
  }
}

