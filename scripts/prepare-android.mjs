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

// Add the AdblockAndroid dependency to the generated Capacitor project.
const settingsCandidates = [
  path.join(androidRoot, "settings.gradle"),
  path.join(androidRoot, "settings.gradle.kts")
];
const settingsPath = await (async () => {
  for (const candidate of settingsCandidates) {
    try { await readFile(candidate, "utf8"); return candidate; } catch {}
  }
  return null;
})();
if (!settingsPath) throw new Error("Could not locate generated Android settings.gradle.");

let settingsText = await readFile(settingsPath, "utf8");
if (!settingsText.includes("jitpack.io")) {
  const dependencyRepositories = /(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/;
  if (dependencyRepositories.test(settingsText)) {
    settingsText = settingsText.replace(
      dependencyRepositories,
      '$1\n        maven { url = uri("https://jitpack.io") }\n        maven { url = uri("https://artifactory.appodeal.com/appodeal-public") }'
    );
    await writeFile(settingsPath, settingsText, "utf8");
  } else {
    // Capacitor 8 templates may put dependency repositories in the root build.gradle
    // instead of settings.gradle. Prefer that location if it exists.
    const rootGradle = path.join(androidRoot, "build.gradle");
    const rootGradleKts = path.join(androidRoot, "build.gradle.kts");
    let rootGradlePath = rootGradle;
    try { await readFile(rootGradlePath, "utf8"); }
    catch { rootGradlePath = rootGradleKts; }

    let rootGradleText;
    try { rootGradleText = await readFile(rootGradlePath, "utf8"); }
    catch { rootGradleText = null; }

    const allProjectsRepositories = rootGradleText
      ? /(allprojects\s*\{[\s\S]*?repositories\s*\{)/
      : null;

    if (rootGradleText && allProjectsRepositories.test(rootGradleText)) {
      const entry = rootGradlePath.endsWith(".kts")
        ? '$1\n        maven { url = uri("https://jitpack.io") }\n        maven { url = uri("https://artifactory.appodeal.com/appodeal-public") }'
        : '$1\n        maven { url "https://jitpack.io" }\n        maven { url "https://artifactory.appodeal.com/appodeal-public" }';
      rootGradleText = rootGradleText.replace(allProjectsRepositories, entry);
      await writeFile(rootGradlePath, rootGradleText, "utf8");
    } else {
      // Last-resort modern Gradle settings block, when the generated project has
      // no shared repository block at all.
      const kotlinDsl = settingsPath.endsWith(".kts");
      const repositoriesBlock = kotlinDsl
        ? '\ndependencyResolutionManagement { repositories { google(); mavenCentral(); maven { url = uri("https://jitpack.io") }; maven { url = uri("https://artifactory.appodeal.com/appodeal-public") } } }\n'
        : '\ndependencyResolutionManagement { repositories { google(); mavenCentral(); maven { url "https://jitpack.io" }; maven { url "https://artifactory.appodeal.com/appodeal-public" } } }\n';
      await writeFile(settingsPath, settingsText + repositoriesBlock, "utf8");
    }
  }
}
const appGradlePath = path.join(androidRoot, "app", "build.gradle");
const appGradleKtsPath = path.join(androidRoot, "app", "build.gradle.kts");
let appGradlePathResolved = appGradlePath;
try { await readFile(appGradlePathResolved, "utf8"); }
catch { appGradlePathResolved = appGradleKtsPath; }

let appGradle = await readFile(appGradlePathResolved, "utf8");
const adblockDependency = "com.github.Edsuns.AdblockAndroid:ad-filter:master-SNAPSHOT";
if (!appGradle.includes(adblockDependency)) {
  if (appGradlePathResolved.endsWith(".kts")) {
    appGradle = appGradle.replace(
      /dependencies\s*\{/,
      (match) => match + '\n    implementation("' + adblockDependency + '")'
    );
  } else {
    appGradle = appGradle.replace(
      /dependencies\s*\{/,
      (match) => match + "\n    implementation '" + adblockDependency + "'"
    );
  }
  await writeFile(appGradlePathResolved, appGradle, "utf8");
}

console.log("Prepared Piko Beats native browser with the AdblockAndroid filter library.");
