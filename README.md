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

## append-only resize

this implements a simple resize strategy, when the hashtable starts to become saturated,
a second hashtable twice the size is allocated. when querying, look in the largest
hashtable first. 

## TODO

* migrate records accessed into the large table, and throw out
the smaller ones when possible.
* maybe implement multiple records? for not quite unique values?
* support different key sizes.

## api

### FlumeViewHashTable = require('flumeview-hashtable')

#### FlumeViewHashTable(version, hash, getKey, minSlots) => fvht

create a flumeview based on a hash table. This view is suitable only
for unique keys.
`version` is an integer. If you change any of the supplied functions
or the version of this library, `version` must be changed.

`hash` and `getKey` are passed to [HashTable](./#HashTable) module.
see documentation below.

`minSlots` is the size of the smallest hashtable to start with.

`fvht` supports the required flumeview apis (`since, createSink, destroy, close`)
and also exposes methods `get` and `load`

#### fvht.get(key, cb(err, data))

retrive a record by `key`.

#### fvht.load() => float

returns the current load, `count / slots`. when this is near 0.5 it will make the hashtable
bigger, which will decrease the load.

### HashTable = require('flumeview-hashtable/hashtable')

create hashtables that look up data asynchronously.

#### HashTable(hash, matches, get) => createHashTable(buffer) => ht

takes `hash` `matches` and `get` and returns a factory function that accepts
a buffer, and returns a hashtable instance.

``` js
//initialize a hash table with
var createHashTable = HashTable(hash, matches, get)

//pass a buffer for the hashtable to use.
var ht = createHashTable(Buffer.alloc(4*1024*1024))
//or give the number of slots desired.
var ht = createHashTable(1024*1024)
```

setting up a new hash table requires passing in 3 methods that will be used
to hash input values and return results.

##### `hash(key) => index`

Takes a key (of any type, but that you indend to pass to `ht.add(key, index)` later
and returns a 32 bit int hash value, that will be used as the index within the hashtable.
`hash` would usually contain a hash function, but if the key is already a hash,
it's okay to just read a integer from it.

`index` must not ever be zero because zero represents an empty space in the filter.

##### `matches(data, key) => boolean`

when you call `get(key, cb)` this method is used to check each value,
after it is returned by `get`. `data` is the record retrived, and `key` is the query.

##### `get(index, cb(err, data))`

retrive `data` at key.
if you added `ht.add(key, index)` then did `ht.get(key)` `get(index, cb)` will be called.

#### `ht.slots => int`

a read only property, the maximum capacity of the hashtable.

#### `ht.count => int`

a read only property, the current occupied capacity of the hashtable.
hashtables become inefficient when they become full, so usually you want
to move to a new hashtable when `ht.count >= ht.slots/2`

#### `ht.add(key, index)`

add a `key`, pointing at `index`. `index` must be a 32 bit int.
The return value for get is expected to be already stored at `index`.

#### `ht.get(key, cb(err, data))`

retrive a previously added key. This will look up the index, and call `get(index, cb)`
(which was passed to `createHashTable(hash, matches, get)`).

#### `ht.buffer => Buffer`

a read only property. The buffer making up the hash table.
The first two UInt32LE's (unsigned 32 bit big endian int) store the `slots` and the `count`.
the rest are slots that may have indexes stored.

#### `ht.load()`

return `count / slots` when greater than 0.5 it's time to allocate a new hashtable.
when a new hashtable is created, it will be twice the size of the previous one.

### createMulti = require('flumeview-hashtable/multi')

create progressively larger hashtables, so they remain efficient.

#### createMulti(createHashTable(buffer)) => MultiHashTable

given the initialized `createHashTable` function, returns an `MultiHashTable` instance.
this has the same api as HashTable, except it handles resizing automatically.

#### mht.count => int

the number of items currently in the collection of hash tables.

#### mht.slots => int

the number of available slots in the collection of hash tables.

#### mht.get(key, cb(err, data))

call with key and returns the first data found that `matches` the `key`

### mht.add(key, index)

adds `key` to the hashtable. The key is only added to the last created,
largest hashtable.

### mht.buffer() => [buffer,...]

returns an array of all buffers in the collection of hashtables.

## License

MIT
