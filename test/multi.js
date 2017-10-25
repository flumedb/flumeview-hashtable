var Multi = require('../multi')
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

tape('growing, with random integers', function (t) {

  var createHT = require('../hashtable')(hash, matches, get)
  var table = createHT(100)

  var mt = Multi(createHT, [table])

  var r = hash('hello random'+Date.now())

  var c = 0
  for(var i = 0; i < 1000; i++) {
    c++
    var k = mt.add(i, hash(i+'value'))
    mt.get(i, function (err, j) {
      if(err) throw err
      t.equal(j, hash(i+'value'))
    })
    t.notEqual(k, i)
  }
  console.log(mt.count, mt.slots, mt.load())
  t.equal(mt.count, 1000)
  t.equal(mt.count, c)
  t.ok(mt.load() < 0.5001)
  t.end()
})


tape('overwrite', function (t) {
  var createHT = require('../hashtable')(hash, matches, get)
  var mt = Multi(createHT, [createHT(10)])

  t.equal(mt.add(1, 1), true)
  t.equal(mt.count, 1)
  t.equal(mt.add(1, 1), false)
  t.equal(mt.count, 1)
  t.end()
})

tape('restore', function (t) {
  var createHT = require('../hashtable')(hash, matches, get)

  var createHT = require('../hashtable')(hash, matches, get)
  var mt = Multi(createHT, [createHT(10)])

  var N = 100
  for(var i = 0; i < N; i++) {
    var k = mt.add(i, hash(i+'value'))
  }

  var buf = Buffer.concat(mt.buffer())
  var mt2 = Multi(createHT, buf)

  for(var i = 0; i < N; i++) {
    mt2.get(i, function (err, value) {
      if(err) throw err
      t.equal(value, hash(i+'value'))
    })
  }

  t.end()
})


