# readsy

Read stream wrapper that supports async initialization.

[![Build Status](https://travis-ci.org/cshum/readsy.svg?branch=master)](https://travis-ci.org/cshum/readsy)

```
npm install readsy
```

### `var rs = readsy(init, [opts])`
### `var rs = readsy.obj(init, [opts])`

Wraps a new readable stream (or object stream) by passing `init` callback function.

```js
var readsy = require('readsy')

var readStream = readsy((cb) => {
  setTimeout(() => {
    cb(null, fs.createReadStream('/dev/urandom'))
  }, 100)
})

readStream.pipe(fs.createWriteStream('/dev/null'))
```

## License

MIT

