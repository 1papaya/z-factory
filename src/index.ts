import type { IDecodedPNG } from "fast-png";

export interface ElevationTile extends IDecodedPNG {
  coord: TileCoord;
}

export type TileCoord = [number, number, number]; // [zoom, x, y]
export type Point = [number, number]; // [lon, lat]

export * from "./cache";
export * from "./factory";
export * from "./source";