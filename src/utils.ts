import type { TileCoord, Point } from "./index";

// thanks to @mapbox/tilebelt (MIT License)
export const pointToTileFraction = function (
  point: Point,
  zoom: number
): TileCoord {
  let sin = Math.sin(point[1] * (Math.PI / 180)),
    z2 = Math.pow(2, zoom),
    x = z2 * (point[0] / 360 + 0.5),
    y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI);

  // Wrap Tile X
  x = x % z2;
  if (x < 0) x = x + z2;
  return [zoom, x, y];
};

// thanks to @mapbox/tilebelt (MIT License)
export const pointToTile = function (point: Point, zoom: number): TileCoord {
  let tile = pointToTileFraction(point, zoom);

  tile[1] = Math.floor(tile[1]);
  tile[2] = Math.floor(tile[2]);

  return tile;
};
