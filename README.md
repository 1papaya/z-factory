## z-factory
Add elevation to your lon/lats with PNG elevation tiles

### Features
* Works in browser and on server-side with Node.js
* Defaults to AWS Terrain Tiles data source so elevation sampling is free with no API key
* Bilinear and nearest neighbor sampling
* Mapbox, Maptiler, and NasaDEM elevation sources with API key
* Supports local disk cache in addition to remote source
* Well-tested to be sure calculations are accurate
* Promise-based, written in TypeScript

### Install
```
npm install z-factory
```

### Basic example
```js
import { ZFactory } from 'z-factory';

// default uses in-memory cache & AWS Terrain Tiles & bilinear sampling
const zfactory = new ZFactory();
const mtEverest = [86.9250, 27.9881];

// get elevation using terrain tiles at zoom level 10
zfactory.getZ(mtEverest, 10).then(ele => {
  console.log(ele);
});

// 8672.794844986805
```

### More in-depth options
```js
import { ZFactory, MapTilerTileSource, FileTileCache } from 'z-factory';

// FileTileCache uses a local elevation tile if it exists, or if not downloads
// the tile from tile source and caches it (note: node.js only)
const localCache = new FileTileCache('./tiles');

// custom tile source; also MapboxTileSource and NasaDemTileSource
const tileSource = new MapTilerTileSource({ apiKey: "[API_KEY]"});

const zfactory = new ZFactory(tileSource, localCache);
const mtEverest = [86.9250, 27.9881];

Promise.all([
  zfactory.getZ(mtEverest, 10, "nearest"),
  zfactory.getZ(mtEverest, 10, "bilinear")
]).then(([nn, bi]) => {
  console.log(`nn: ${nn}; bi: ${bi}`);
});

// nn: 8663; bi: 8672.794844986805
```

### Notes

* While the result of the sampling calculation is guaranteed to be accurate, the value may be off due to the resolution of the underlying data; make sure to  consult the documentation of each terrain tile source.
* In-browser package comes bundled with [pako](https://github.com/nodeca/pako) in order to decode PNG tiles; this adds a considerable amount of file size
* Contributions welcome!

### License

MIT