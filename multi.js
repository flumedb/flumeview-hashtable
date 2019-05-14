
//instead of one single hashtable,
//use a series of increasing size
//so that we do not need to rebuild the table.

module.exports = function (createHashtable, tables) {
  var count = 0, slots = 0
  if(Buffer.isBuffer(tables)) {
    var buffer = tables
    tables = []
    var start = 0
    while(start < buffer.length) {
      var slots = buffer.readUInt32BE(start)
      var end = start + 8 + slots * 4
      tables.push(createHashtable(buffer.slice(start, end)))
      start = end
    }
  }

  for(var i = 0; i < tables.length; i++) {
    count += tables[i].count
    slots += tables[i].slots
  }
  var self
  return self = {
    count: count,

    slots: slots,

    get: function (key, cb) {
      ;(function next (i) {
        tables[i].get(key, function (err, value) {
          if(value) cb(null, value)
          else if(i) next(i-1)
          else cb(err)
        })
      })(tables.length-1)
    },

    add: function (key, index) {
      var last = tables[tables.length-1]
      if(last.load() >= 0.5) {
        tables.push(last = createHashtable(last.slots*2))
        self.slots = slots += last.slots
      }
      if(last.add(key, index)) {
        self.count = ++ count
        return true
      }
      return false
    },

    load: function () {
      return count/slots
    },

    buffer: function () {
      return tables.map(function (e) { return e.buffer })
    }
  }
}

