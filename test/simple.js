const Log = require('flumelog-offset')
const Flume = require('flumedb')
const crypto = require('crypto')
const test = require('tape')

function hash (v) {
  return crypto.createHash('sha256')
    .update(v.toString())
    .digest().readUInt32BE(0)
}

const db = Flume(
  Log(
    '/tmp/test-flumeview-hashtable-' + String(Math.random()) + '/log.offset',
    {blockSize: 1024, codec: require('flumecodec/json')}
  ))
  .use('index', require('../')(1, hash))

test('no errors, correct value and sequence number', (t) => {
  const item = { key: 'foo', value: 'bar' }

  db.append(item, function (err) {
    t.error(err)
    db.index.get(item.key, function (err, val, seq) {
      t.error(err)
      t.deepEqual(val, item)
      t.equal(seq, 1)
      t.end()
    })
  })
})
