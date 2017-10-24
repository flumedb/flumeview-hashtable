
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

  var ht = require('../hashtable')(hash, matches, get)(2000)

  var r = hash('hello random'+Date.now())

  var k = ht.add('random2'+Date.now(), r)
//  t.equal(ht._get(k), r)
  console.log(k, r)

  var c = 0
  for(var i = 0; i < 1000; i++) {
    c++
    var k = ht.add(i, hash(i+'value'))
    ht.get(i, function (err, j) {
      if(err) throw err
      t.equal(j, hash(i+'value'))
    })
    t.notEqual(k, i)
  }
  console.log(c)
  //1001 because we add one before the loop
  t.equal(ht.count, 1001)
  t.equal(ht.load(), 0.5005)
  t.end()
})

tape('overwrite', function (t) {

  var ht = require('../hashtable')(hash, matches, get)(10)

  t.equal(ht.add(1, 1), true)
  t.equal(ht.count, 1)
  t.equal(ht.add(1, 1), false)
  t.equal(ht.count, 1)
  console.log(ht.buffer)
  t.end()
})


