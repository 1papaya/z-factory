import type { TileCoord } from "../src/index";
import { ZFactory, AWSTileSource, FileTileCache } from "../src/index";
import * as assert from "assert";
import * as _ from "./common";
import * as fs from "fs";

describe("File Tile Cache", function () {
  let source = new AWSTileSource({ verbose: true });
  let cache = new FileTileCache("./test/tmp/cache");
  let factory = new ZFactory(source, cache);
  let sampleCoords = _.loadJson(
    "./test/data/correct/random-points.geojson"
  ).features.map((feat) => feat.geometry.coordinates);

  before(function () {
    if (fs.existsSync("./test/tmp"))
      fs.rmdirSync("./test/tmp", { recursive: true });

    fs.mkdirSync("./test/tmp/cache", { recursive: true });
  });

  it(`correctly downloads files from source`, async function () {
    for (let i = 0; i < sampleCoords.length; i++) {
      await factory.getZ(sampleCoords[i], 12);
    }

    ["1844/1706", "1844/1707", "1845/1706", "1845/1707"].forEach(
      (tileCoord) => {
        assert(fs.existsSync(`./test/tmp/cache/12/${tileCoord}.png`));
      }
    );
  });

  it(`correctly uses saved files when exists`, async function () {
    class FakeTileSource extends AWSTileSource {
      get(tileCoord: TileCoord): Promise<ArrayBuffer> {
        return new Promise((res, rej) => {
          throw new Error();
        });
      }
    }
    const fakeFactory = new ZFactory(new FakeTileSource(), cache);

    for (const tileCoord of [
      "1844/1706",
      "1844/1707",
      "1845/1706",
      "1845/1707",
    ]) {
      const fullTileCoord = [
        12,
        ...tileCoord.split("/").map((str) => parseInt(str)),
      ] as TileCoord;

      cache.delete(fullTileCoord);
      assert.doesNotThrow(async () => await fakeFactory.getTile(fullTileCoord));
    }
  });
});
