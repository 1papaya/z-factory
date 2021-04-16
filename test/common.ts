import * as fs from "fs";

export const loadJson = (path) =>
  JSON.parse(
    fs.readFileSync(path, {
      encoding: "utf8",
    })
  );
