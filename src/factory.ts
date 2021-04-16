import type { Point, TileCoord, ElevationTile } from "./index";
import type { BBox } from "geojson";
import { pointToTileFraction, pointToTile } from "./utils";
import { TileSource, AWSTileSource } from "./source";
import { TileCache } from "./cache";

export type ZFactoryOptions = {
  defaultSampleMethod?: string;
  verbose?: boolean;
};

const defaultZFactoryOptions: ZFactoryOptions = {
  defaultSampleMethod: "bilinear",
  verbose: false,
};

export class ZFactory {
  cache: TileCache;
  source: TileSource;
  verbose: boolean;
  defaultSampleMethod: string;

  constructor(
    source: TileSource = new AWSTileSource(),
    cache: TileCache = new TileCache(),
    opt: ZFactoryOptions = defaultZFactoryOptions
  ) {
    opt = Object.assign({}, defaultZFactoryOptions, opt);

    this.cache = cache;
    this.source = source;

    this.verbose = opt.verbose;
    this.defaultSampleMethod = opt.defaultSampleMethod;
  }

  getZ(
    point: Point,
    zoom: number,
    sampleMethod = this.defaultSampleMethod
  ): Promise<number> {
    const pointTileFraction = pointToTileFraction(point, zoom);
    const pointTile: TileCoord = [
      zoom,
      Math.floor(pointTileFraction[1]),
      Math.floor(pointTileFraction[2]),
    ];

    return this.getTile(pointTile).then((tileData) => {
      const tileFraction: [number, number] = [
        pointTileFraction[1] - pointTile[1],
        pointTileFraction[2] - pointTile[2],
      ];

      return sampleMethod === "nearest"
        ? this._nearest(tileData, tileFraction)
        : this._bilinear(tileData, tileFraction);
    });
  }

  getTile(tileCoord: TileCoord): Promise<ElevationTile> {
    if (!this.cache.has(tileCoord))
      this.cache.load(tileCoord, this.source);

    return this.cache.get(tileCoord);
  }

  async _nearest(
    tileData: ElevationTile,
    tileFraction: [number, number]
  ): Promise<number> {
    const pixelX = Math.floor(tileFraction[0] * tileData.width);
    const pixelY = Math.floor(tileFraction[1] * tileData.height);

    return this._pixelElev(tileData, pixelX, pixelY);
  }

  async _pixelElev(
    tileData: ElevationTile,
    pixelX: number,
    pixelY: number
  ): Promise<number> {
    return new Promise(async (res, rej) => {
      const isRight = pixelX > tileData.width - 1;
      const isTop = pixelY > tileData.height - 1;
      const isLeft = pixelX < 0;
      const isBottom = pixelY < 0;

      // deal with edge cases
      if (isRight || isTop || isLeft || isBottom) {
        const [tileZ, tileX, tileY] = tileData.coord;

        if (isRight && isTop) {
          // top right corner
          tileData = await this.getTile([tileZ, tileX + 1, tileY + 1]);
          pixelX = 0;
          pixelY = 0;
        } else if (isRight && isBottom) {
          // bottom right corner
          tileData = await this.getTile([tileZ, tileX + 1, tileY - 1]);
          pixelX = 0;
          pixelY = tileData.height - 1;
        } else if (isLeft && isTop) {
          // top left corner
          tileData = await this.getTile([tileZ, tileX - 1, tileY + 1]);
          pixelX = tileData.width - 1;
          pixelY = 0;
        } else if (isLeft && isBottom) {
          // bottom left corner
          tileData = await this.getTile([tileZ, tileX - 1, tileY - 1]);
          pixelX = tileData.width - 1;
          pixelY = tileData.height - 1;
        } else if (isRight) {
          // right side
          tileData = await this.getTile([tileZ, tileX + 1, tileY]);
          pixelX = 0;
        } else if (isTop) {
          // top
          tileData = await this.getTile([tileZ, tileX, tileY + 1]);
          pixelY = 0;
        } else if (isLeft) {
          // left side
          tileData = await this.getTile([tileZ, tileX - 1, tileY]);
          pixelX = tileData.width - 1;
        } else if (isBottom) {
          // bottom
          tileData = await this.getTile([tileZ, tileX, tileY - 1]);
          pixelY = tileData.height - 1;
        } else {
          // pretty sure this is impossible but ok
          rej(NaN);
        }
      }

      const pixelIdx = (pixelY * tileData.height + pixelX) * tileData.channels;

      res(
        this.source.elevFn(
          tileData.data[pixelIdx],
          tileData.data[pixelIdx + 1],
          tileData.data[pixelIdx + 2]
        )
      );
    });
  }

  async _bilinear(
    tileData: ElevationTile,
    tileFraction: [number, number]
  ): Promise<number> {
    const x = tileFraction[0] * tileData.width;
    const y = tileFraction[1] * tileData.height;

    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);

    let xPos = x - pixelX;
    let yPos = y - pixelY;

    // https://en.wikipedia.org/wiki/Bilinear_interpolation#Algorithm

    const bilinear = (f00, f10, f01, f11, x, y) =>
      f00 * (1 - x) * (1 - y) +
      f10 * x * (1 - y) +
      f01 * (1 - x) * y +
      f11 * x * y;

    try {
      if (xPos >= 0.5) {
        if (yPos >= 0.5) {
          // ne quadrant
          return Promise.all([
            this._pixelElev(tileData, pixelX, pixelY),
            this._pixelElev(tileData, pixelX + 1, pixelY),
            this._pixelElev(tileData, pixelX, pixelY + 1),
            this._pixelElev(tileData, pixelX + 1, pixelY + 1),
          ]).then((f) => bilinear(...f, xPos - 0.5, yPos - 0.5));
        } else {
          // se quadrant
          return Promise.all([
            this._pixelElev(tileData, pixelX, pixelY - 1),
            this._pixelElev(tileData, pixelX + 1, pixelY - 1),
            this._pixelElev(tileData, pixelX, pixelY),
            this._pixelElev(tileData, pixelX + 1, pixelY),
          ]).then((f) => bilinear(...f, xPos - 0.5, yPos + 0.5));
        }
      } else {
        if (yPos >= 0.5) {
          // nw quadrant
          return Promise.all([
            this._pixelElev(tileData, pixelX - 1, pixelY),
            this._pixelElev(tileData, pixelX, pixelY),
            this._pixelElev(tileData, pixelX - 1, pixelY + 1),
            this._pixelElev(tileData, pixelX, pixelY + 1),
          ]).then((f) => bilinear(...f, xPos + 0.5, yPos - 0.5));
        } else {
          // sw quadrant
          return Promise.all([
            this._pixelElev(tileData, pixelX - 1, pixelY - 1),
            this._pixelElev(tileData, pixelX, pixelY - 1),
            this._pixelElev(tileData, pixelX - 1, pixelY),
            this._pixelElev(tileData, pixelX, pixelY),
          ]).then((f) => bilinear(...f, xPos + 0.5, yPos + 0.5));
        }
      }
    } catch (e) {
      console.error(e);
      return new Promise((res) => res(NaN));
    }
  }

  preLoadBbox(bbox: BBox, minZoom: number, maxZoom: number) {
    const preloadTiles = [];

    // deal with bbox's being either order (sw/ne, ne/sw)
    for (let z = minZoom; z <= maxZoom; z++) {
      const sw = pointToTile([bbox[0], bbox[1]], z);
      const ne = pointToTile([bbox[2], bbox[3]], z);

      const startX = Math.min(sw[1], ne[1]);
      const startY = Math.min(sw[2], ne[2]);

      const numX = Math.abs(sw[1] - ne[1]);
      const numY = Math.abs(sw[2] - ne[2]);

      for (let x = 0; x < numX; x++)
        for (let y = 0; y < numY; y++)
          preloadTiles.push([z, startX + x, startY + y]);
    }

    return preloadTiles.map((tile) => this.getTile(tile));
  }
}
