import type { TileCoord, ElevationTile } from "./index";
import * as fastpng from "fast-png";
import * as path from "path";
import * as fs from "fs";

export type TileCacheOptions = {
  verbose?: boolean;
};

const defaultTileCacheOptions = {
  verbose: false,
};

export class TileCache extends Map {
  verbose: boolean;

  constructor(opt: TileCacheOptions = {}) {
    super();

    this.verbose = opt.verbose || defaultTileCacheOptions.verbose;
  }

  get(tileCoord: TileCoord): Promise<ElevationTile | undefined> {
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

  set(tileCoord: TileCoord, value: Promise<ArrayBuffer>) {
    const localTilePath = path.join(
      this.localPath,
      `${this._tileCoordString(tileCoord)}.png`
    );

    return super.set(
      tileCoord,
      value.then((arrayBuffer) => {
        return fs.promises
          .mkdir(path.dirname(localTilePath), { recursive: true })
          .then(() =>
            fs.promises.writeFile(localTilePath, Buffer.from(arrayBuffer))
          )
          .then(() => arrayBuffer);
      })
    );
  }

  get(tileCoord: TileCoord): Promise<ElevationTile | undefined> {
    if (!this.has(tileCoord)) {
      const localTilePath = path.join(
        this.localPath,
        `${this._tileCoordString(tileCoord)}.png`
      );

      // if tile exists locally, return it
      // if not, download it to local machine and return

      return fs.promises
        .readFile(localTilePath)
        .then((tile) => {
          this.set(tileCoord, new Promise((res) => res(tile)));
          return this.get(tileCoord);
        })
        .catch(() => undefined);
    }

    return super.get(tileCoord);
  }
}
