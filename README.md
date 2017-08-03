# flumeview-hashtable

A in-memory hashtable based flumeview.

Creates an unordered key:value mapping over a flumedb.
the key for each indexed record must be unique, and
the value will be the record stored in the log.
Since flumedb uses integer keys for the log implementation,
the hashtable is just a sparse array of integers, implemented
on a buffer. This means that a relatively small buffer (say 1mb)
can hold hundreds of thousands of references, and since buffers
are not traversed by the garbage collector, this is not a burden
on your app. Also, there is no disk-io while building the index
so if the only disk access is very slow (i.e. browser) this is great.

## example

``` js
//you need to provide a hash function.
//it doesn't actually need to be cryptographic

function hash (v) {
  return crypto.createHash('sha256')
    .update(v.toString())
    .digest().readUInt32BE(0)
}

//default getKey function
function getKey (data) {
  return data.key
}

var db =  Flume(
  Log(
    '/tmp/test-flumeview-hashtable'+Date.now(),
    {blockSize: 1024, codec: require('flumecodec/json')}
  ))
.use('index', require('../')(1, hash, getKey))

db.append({key: 'foo', value: ...}, function (err) {
  if(err) throw err
  db.index.get('foo', function (err, value) {

  })
})
```

## TODO

* resize strategy (okay, so it's not really that useful without this)
* incremental resize
* maybe implement multiple records? for not quite unique values?
* support different key sizes.

## License

MIT

