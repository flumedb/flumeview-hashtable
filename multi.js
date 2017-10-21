
//instead of one single hashtable,
//use a series of increasing size
//so that we do not need to rebuild the table.

module.exports = function (createHashtable, tables) {
  var count = 0, slots = 0
  for(var i = 0; i < tables.length; i++) {
    count += tables[i].count
    slots += tables[i].slots
  }
  console.log("INITIAL", count, slots)
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
    add: function (key, value) {
      var last = tables[tables.length-1]
      if(last.load() >= 0.5) {
        console.log("NEW TABLE", last.slots*2)
        tables.push(last = createHashtable(null, last.slots*2))
        self.slots = slots += last.slots
      }
      last.add(key, value)
      self.count = ++ count
    },
    load: function () {
      return count/slots
    }
  }
}


