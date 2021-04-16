import type { TileCoord, TileSource, ElevationTile } from "./index";
import * as fastpng from "fast-png";
import * as path from "path";
import * as fs from "fs";

export type TileCacheOptions = {
  verbose?: boolean;
};

export class TileCache extends Map {
  verbose: boolean;

  constructor(opt: TileCacheOptions = {}) {
    super();

    this.verbose = opt.verbose || false;
  }

  get(tileCoord: TileCoord): Promise<ElevationTile> | undefined {
    return super.get(this._tileCoordString(tileCoord));
  }

  has(tileCoord: TileCoord) {
    return super.has(this._tileCoordString(tileCoord));
  }

  set(tileCoord: TileCoord, value: Promise<ArrayBuffer>) {
    return super.set(
      this._tileCoordString(tileCoord),
      value.then(
        (arrayBuffer) =>
          Object.assign(fastpng.decode(arrayBuffer), {
            coord: tileCoord,
          }) as ElevationTile
      )
    );
  }

  load(tileCoord: TileCoord, source: TileSource) {
    return this.set(tileCoord, source.get(tileCoord));
  }

  delete(tileCoord: TileCoord) {
    return super.delete(this._tileCoordString(tileCoord));
  }

  _tileCoordString(tileCoord: TileCoord): string {
    return `${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}`;
  }
}

export class FileTileCache extends TileCache {
  localPath: string;

  constructor(localPath: string) {
    super();
    this.localPath = localPath;
  }

  load(tileCoord: TileCoord, source: TileSource) {
    const localTilePath = path.join(
      this.localPath,
      `${this._tileCoordString(tileCoord)}.png`
    );

    return this.set(
      tileCoord,
      fs.promises.readFile(localTilePath).catch(() =>
        source.get(tileCoord).then((arrayBuffer) =>
          fs.promises
            .mkdir(path.dirname(localTilePath), { recursive: true })
            .then(() =>
              fs.promises.writeFile(localTilePath, Buffer.from(arrayBuffer))
            )
            .then(() => arrayBuffer)
        )
      )
    );
  }

  _localTilePath(tileCoord: TileCoord) {
    return path.join(this.localPath, `${this._tileCoordString(tileCoord)}.png`);
  }
}
