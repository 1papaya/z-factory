import {
  ZFactory,
  AWSTileSource,
  MapTilerTileSource,
  MapboxTileSource,
  NasaDemTileSource,
  FileTileCache,
} from "../src/index";
import * as assert from "assert";
import * as _ from "./common";
import * as fs from "fs";

describe("Sample Methods", function () {
  let correct = {},
    factories;

  for (const sampleType of ["nearest", "bilinear"]) {
    for (const source of ["aws", "mapbox", "maptiler", "nasadem"]) {
      const sourceKey = `${source}-${sampleType}`;

      correct[sourceKey] = JSON.parse(
        fs.readFileSync(`./test/data/correct/${sourceKey}.geojson`, {
          encoding: "utf8",
        })
      );
    }
  }

  before(function () {
    factories = {
      aws: new ZFactory(
        new AWSTileSource({ verbose: true }),
        new FileTileCache("./test/data/taburiente/aws")
      ),

      mapbox: new ZFactory(
        new MapboxTileSource({ apiKey: "", verbose: true }),
        new FileTileCache("./test/data/taburiente/mapbox")
      ),

      maptiler: new ZFactory(
        new MapTilerTileSource({ apiKey: "", verbose: true }),
        new FileTileCache("./test/data/taburiente/maptiler")
      ),

      nasadem: new ZFactory(
        new NasaDemTileSource({ apiKey: "", verbose: true }),
        new FileTileCache("./test/data/taburiente/nasadem")
      ),
    };
  });

  for (const sourceKey of Object.keys(correct)) {
    it(`correct ${sourceKey}`, async function () {
      const [source, sampleType] = sourceKey.split("-");
      const correctPoints = correct[sourceKey].features;
      const factory = factories[source];

      for (let i = 0; i < correctPoints.length; i++) {
        const correctEle = correctPoints[i].properties.ele;
        const zfactoryEle = await factory.getZ(
          correctPoints[i].geometry.coordinates,
          11,
          sampleType
        );

        const diff = Math.abs(correctEle - zfactoryEle);
        assert(diff <= 0.01);
      }
    });
  }
});
