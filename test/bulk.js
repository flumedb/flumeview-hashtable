var Log = require('flumelog-offset')
var Flume = require('flumedb')
var crypto = require('crypto')

function hash (v) {
  return crypto.createHash('sha256')
    .update(v.toString())
    .digest().readUInt32BE(0)
}


var db =  Flume(
    Log(
      '/tmp/test-flumeview-hashtable'+Date.now(),
      {blockSize: 1024, codec: require('flumecodec/json')}
    ))
  .use('index', require('../')(1, hash))

  var N = 10000
  var data = []
  for(var i = 0; i < N; i++)
    data.push({key: '#'+i, value: {
      foo: Math.random(), bar: Date.now()
    }})

  db.append(data, function (err, offset) {
    //ordered reads
    var start = Date.now(), n = 0
    for(var i = 0; i < N; i++)
      db.index.get('#'+i, next)
    function next () {
      if(++n == N)
        console.log('done', Date.now() - start)
    }
  })




