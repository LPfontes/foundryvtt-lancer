#!/usr/bin/env node
import child from "node:child_process";
import fs from "node:fs";
import path from "node:path";

if (process.env.CI) process.exit(0);

const dataPath = child.execSync("npx fvtt --config ./fvttrc.yml configure get dataPath").toString().trim();
if ((dataPath || "undefined") !== "undefined") {
  const systemDir = path.resolve(dataPath, "Data", "systems", "lancer");
  try {
    const stats = fs.lstatSync(systemDir);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      console.log("System directory or symlink already exists");
      process.exit(0);
    }
  } catch (e) {
    // Path doesn't exist, proceed
  }

  try {
    fs.symlinkSync(path.resolve("dist"), systemDir, process.platform === "win32" ? "junction" : "dir");
    console.log(`Linked dist to ${systemDir}`);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.log(`Foundry systemdata dir missing: ${path.normalize(path.join(systemDir, ".."))}`);
    } else {
      console.error(`Failed to create symlink: ${e.message}`);
    }
  }
}
