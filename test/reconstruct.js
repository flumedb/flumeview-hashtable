
var tape = require('tape')
var crypto = require('crypto')

function hash (v) {
  return crypto.createHash('sha256').update(v.toString()).digest().readUInt32BE(0)
}

function matches (k, data) {
  return k === data+1
}

function get(k, cb) {
  cb(null, k)
}


tape('reconstruct', function (t) {

  var HT = require('../hashtable')(hash, matches, get)
  var ht = HT(10)
  var N = 10
  for(var i = 0; i < N; i++)
    ht.add(i, i+1) //(i<<8)|0x0f)

  console.log("DUMP", ht.buffer)

  for(var j = 0; j < N; j++)
    ht.get(j, function (err, value) {
      if(err) throw err
      t.equal(value, j+1)
    })

  var ht2 = HT(ht.buffer)
  t.equal(ht2.slots, ht.slots)
  t.equal(ht2.count, ht.count)

  for(var k = 0; k < N; k++)
    ht2.get(k, function (err, value) {
      if(err) throw err
      t.equal(value, k+1)
    })

  t.end()
})


