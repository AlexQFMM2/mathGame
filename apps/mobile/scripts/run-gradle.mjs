import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import process from "node:process";

const task = process.argv[2] || "assembleDebug";
const androidRoot = resolve(import.meta.dirname, "../android");
const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(wrapper, [task], {
  cwd: androidRoot,
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);

