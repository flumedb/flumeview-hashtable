
var tape = require('tape')
var crypto = require('crypto')

function hash (v) {
  return crypto.createHash('sha256').update(v.toString()).digest().readUInt32BE(0)
}

function matches (k, data) {
  return k === hash(data+'value')
}

function get(k, cb) {
  cb(null, k)
}

tape('random integers', function (t) {

  var ht = require('../hashtable')(hash, matches, get)(null, 2000)

  var r = hash('hello random'+Date.now())

  var k = ht.add('random2'+Date.now(), r)
  t.equal(ht._get(k), r)
  console.log(k, r)

  for(var i = 0; i < 1000; i++) {
    var k = ht.add(i, hash(i+'value'))
    ht.get(i, function (err, j) {
      if(err) throw err
      t.equal(j, hash(i+'value'))
    })
    t.notEqual(k, i)
  }
  console.log(ht.buffer.toString('hex'))
  t.end()

})


