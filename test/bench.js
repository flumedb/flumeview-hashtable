var Log = require('flumelog-offset')
var Flume = require('flumedb')
var crypto = require('crypto')
  function hash (v) {
    return crypto.createHash('sha256')
      .update(v.toString())
      .digest().readUInt32BE(0)
  }

require('test-flumeview-index/bench')(function (file) {
  return Flume(
    Log(
      file,
      {blockSize: 1024, codec: require('flumecodec/json')}
    ))
    .use('index', require('../')(1, hash, null, Math.pow(2, 16)))
})



