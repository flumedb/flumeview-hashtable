var Log = require('flumelog-offset')
var Flume = require('flumedb')
var crypto = require('crypto')

function hash (v) {
  return crypto.createHash('sha256')
    .update(v.toString())
    .digest().readUInt32BE(0)
}

function Timer (name) {
  var start = Date.now()
  return function (ops) {
    var seconds = (Date.now() - start)/1000
    console.log(name, ops, ops/seconds)
  }
}

var create = function (file) {
  return Flume(
    Log(
      file,
      {blockSize: 1024, codec: require('flumecodec/json')}
    ))
    .use('index', require('../')(1, hash, null, Math.pow(2, 13)))
}

function initialize (db, N, cb) {
  var data = []
  for(var i = 0; i < N; i++)
    data.push({key: '#'+i, value: {
      foo: Math.random(), bar: Date.now()
    }})

  var t = Timer('append')
  db.append(data, function (err, offset) {
    //wait until the view is consistent!
    db.index.since(function (v) {
      if(v < offset) return
      cb(null, N)
    })
  })
}

function ordered (db, N, cb) {
  //ordered reads
  var n = 0
  for(var i = 0; i < N; i++) {
    db.index.get('#'+i, next)
  }

  function next (err, v) {
    if(++n == N) cb(null, N)
  }
}

function random (db, N, cb) {
  ;(function get(i) {
    if(i >= N) return cb(null, N)

    db.index.get('#'+~~(Math.random()*N), function (err, data) {
      setImmediate(function () { get(i+1) })
    })

  })(0)

}

var file = '/tmp/test-flumeview-hashtable'+Date.now()+'/log.offset'

var db = create(file)
var N = 10000
var t = Timer('append')
initialize(db, N, function (err, n) {
  t(n)
  t = Timer('ordered_cached')
  ordered(db, N, function (err, n) {
    t(n)
    t = Timer('random_cached')
    random(db, N, function (err, n) {
      t(n)
      t = Timer('ordered')
      ordered(create(file), N, function (err, n) {
        t(n)
        t = Timer('random_cached')
        random(create(file), N, function (err, n) {
          t(n)
        })
      })
    })
  })
})

