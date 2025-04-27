import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

export default async function getScripts() {
  const availableScripts: Map<string, string> = new Map();

  const scanResult = (
    await readdir(resolve(import.meta.dirname), {
      withFileTypes: true,
    })
  ).filter(
    (dirent) =>
      join(dirent.parentPath || dirent.path, dirent.name) !==
      import.meta.filename
  );

  for (const dirent of scanResult) {
    const scriptName = basename(dirent.name, extname(dirent.name));
    let scriptPath = join(dirent.path, dirent.name);
    if (dirent.isDirectory()) {
      const hasFile = (await readdir(scriptPath)).find(
        (file) => basename(file, extname(file)) === scriptName
      );

      if (hasFile) {
        scriptPath = join(scriptPath, hasFile);
      }
    }
    availableScripts.set(scriptName, scriptPath);
  }

  return availableScripts;
}
