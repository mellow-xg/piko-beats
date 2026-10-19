import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const androidRoot = path.resolve("android");
const sourceRoot = path.join(androidRoot, "app", "src", "main", "java");

async function findFile(dir, filename) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return null; }
  for (const entry of entries) {
    if (entry.name === "build" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return full;
    if (entry.isDirectory()) {
      const found = await findFile(full, filename);
      if (found) return found;
    }
  }
  return null;
}

const mainActivity = await findFile(sourceRoot, "MainActivity.java");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
if (!mainActivity) {
  console.error("Android project not found. Run npx cap add android first.");
  process.exit(1);
}

const existingMain = await readFile(mainActivity, "utf8");
const packageName = existingMain.match(/^package\s+([A-Za-z0-9_.]+);/m)?.[1];
if (!packageName) throw new Error("Could not determine Android package name from MainActivity.java.");

const nativeDir = path.dirname(mainActivity);
await mkdir(nativeDir, { recursive: true });

const templateDir = path.resolve("native-templates");
const copyTemplate = async (templateName, outputName) => {
  const template = await readFile(path.join(templateDir, templateName), "utf8");
  await writeFile(path.join(nativeDir, outputName), template.replaceAll("__PACKAGE__", packageName), "utf8");
};

await copyTemplate("MainActivity.java.template", "MainActivity.java");
await copyTemplate("PrivacyBrowserPlugin.java.template", "PrivacyBrowserPlugin.java");
await copyTemplate("PrivacyBrowserActivity.java.template", "PrivacyBrowserActivity.java");

let manifest = await readFile(manifestPath, "utf8");
if (!manifest.includes(".PrivacyBrowserActivity")) {
  const applicationTag = /<application\b[^>]*>/;
  if (!applicationTag.test(manifest)) throw new Error("Could not locate application tag in AndroidManifest.xml.");
  manifest = manifest.replace(applicationTag, (match) => match + '\n        <activity\n            android:name=".PrivacyBrowserActivity"\n            android:exported="false"\n            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|screenLayout|uiMode"\n            android:windowSoftInputMode="adjustResize" />');
  await writeFile(manifestPath, manifest, "utf8");
}

console.log("Prepared Piko Beats native browser plugin and Activity.");
