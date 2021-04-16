import type { TileCoord } from "./index";
import * as plimit_ from "p-limit";
import fetch from "cross-fetch";

// fix error: (!) Cannot call a namespace ('plimit')
const plimit = plimit_;

type TileSourceOptions = {
  concurrency?: number;
  verbose?: boolean;
};

type TileSourceSpecs = {
  width: number;
  maxZoom: number;
};

export class TileSource {
  elevFn: Function;
  urlFn: Function;

  maxZoom: number;
  width: number;

  verbose: boolean;
  _queue: any;

  constructor(
    urlFn: Function,
    elevFn: Function,
    specs: TileSourceSpecs,
    opt: TileSourceOptions = {}
  ) {
    this.urlFn = urlFn;
    this.elevFn = elevFn;

    this.maxZoom = specs.maxZoom;
    this.width = specs.width;

    this.verbose = opt.verbose || false;
    this._queue = plimit(opt.concurrency || 4);
  }

  async get(tileCoord: TileCoord): Promise<ArrayBuffer> {
    if (tileCoord[0] > this.maxZoom)
      throw new Error(
        `tileCoord ${tileCoord} out of bounds (maxZoom: ${this.maxZoom})`
      );

    if (this.verbose) console.log(`source get: ${this.urlFn(tileCoord)}`);

    return this._queue(() =>
      fetch(this.urlFn(tileCoord), {
        method: "GET",
        mode: "cors",
        redirect: "follow",
        headers: {
          Accept: "*",
        },
      }).then((resp) => {
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        else return resp.arrayBuffer();
      })
    );
  }
}

export class AWSTileSource extends TileSource {
  constructor(opt: TileSourceOptions = {}) {
    const baseUrl = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";

    super(
      (tileCoord: TileCoord) =>
        `${baseUrl}/${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}.png`,
      (r, g, b) => r * 256 + g + b / 256 - 32768,
      {
        maxZoom: 16,
        width: 256,
      },
      opt
    );
  }
}

export class NasaDemTileSource extends TileSource {
  constructor(apiKey: string, opt: TileSourceOptions = {}) {
    const baseUrl = "https://www.nasadem.xyz/api/v1/dem";

    super(
      (tileCoord: TileCoord) =>
        `${baseUrl}/${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}.png?key=${apiKey}`,
      (r, g, b) => 256 * r + g - 32768,
      {
        maxZoom: 11,
        width: 512,
      },
      opt
    );
  }
}

export class MapTilerTileSource extends TileSource {
  constructor(apiKey: string, opt: TileSourceOptions = {}) {
    const baseUrl = "https://api.maptiler.com/tiles/terrain-rgb";

    super(
      (tileCoord: TileCoord) =>
        `${baseUrl}/${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}.png?key=${apiKey}`,
      (r, g, b) => -10000 + (r * 256 * 256 + g * 256 + b) * 0.1,
      {
        maxZoom: 10,
        width: 512,
      },
      opt
    );
  }
}

export class MapboxTileSource extends TileSource {
  constructor(apiKey: string, opt: TileSourceOptions = {}) {
    const baseUrl = "https://api.mapbox.com/v4/mapbox.terrain-rgb";

    super(
      (tileCoord: TileCoord) =>
        `${baseUrl}/${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}.pngraw?access_token=${apiKey}`,
      (r, g, b) => -10000 + (r * 256 * 256 + g * 256 + b) * 0.1,
      {
        maxZoom: 17,
        width: 256,
      },
      opt
    );
  }
}
