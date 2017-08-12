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


var file = '/tmp/test-flumeview-hashtable'+Date.now()+'/log.offset'
var db =  Flume(
    Log(
      file,
      {blockSize: 1024, codec: require('flumecodec/json')}
    ))
  .use('index', require('../')(1, hash, null, Math.pow(2, 13)))

  var N = 10000
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

    t(N)
    t = Timer('ordered_read')
      //ordered reads
      var n = 0
      for(var i = 0; i < N; i++) {
        db.index.get('#'+i, next)
      }

      function next (err, v) {
        if(++n == N) {
          t(N)
          t = Timer('random_read')
          ;(function get(i) {
            if(i >= N) {
              return t(N)
            }
            db.index.get(data[~~(Math.random()*N)].key, function (err, data) {
              setImmediate(function () { get(i+1) })
            })

          })(0)
        }
      }
    })
  })

