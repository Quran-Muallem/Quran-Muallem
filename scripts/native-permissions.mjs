#!/usr/bin/env node
/**
 * Adds the permissions, the app name and the app icon to the generated native projects.
 * Home-screen label: "Quran Muallem" (launchers cut longer names); full name "Quran Muallem - معلم القرآن" in the stores.
 * Safe to run repeatedly (idempotent). Runs automatically in `bun run cap:sync`.
 *
 *   iOS     ios/App/App/Info.plist            microphone, location, motion (Arabic texts), iPhone only
 *   iOS     UIBackgroundModes audio (recitation keeps playing with the screen locked)
 *   Android android/app/src/main/AndroidManifest.xml   RECORD_AUDIO, INTERNET, ACCESS_FINE/COARSE_LOCATION, ...,
 *           background audio: foreground service (native/android/BackgroundAudio*.java, registered in MainActivity),
 *           no advertising ID, versionCode/versionName from package.json,
 *           Adhan sounds public/adhan/*.mp3 → res/raw/adhan_*.mp3 (notification channel sounds)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const env = (name) => {
  if (process.env[name]) return process.env[name];
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
};

const IOS_STRINGS = {
  NSMicrophoneUsageDescription: "تطبيق حفظ القرآن يحتاج إلى الميكروفون لتحليل وتسميع التلاوة المباركة.",
  NSSpeechRecognitionUsageDescription: "يستخدم التطبيق التعرّف على الكلام لمتابعة تلاوتك كلمةً كلمة.",
  NSLocationWhenInUseUsageDescription: "يحتاج التطبيق إلى موقعك لحساب اتجاه القبلة بدقة. لا يغادر موقعك جهازك.",
  NSMotionUsageDescription: "يستخدم التطبيق مستشعرات الحركة لعرض بوصلة القبلة.",
};

const ANDROID_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.VIBRATE",
  // Sheikh recitation keeps playing with the screen off (native/android/BackgroundAudio*.java)
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.WAKE_LOCK",
  "android.permission.POST_NOTIFICATIONS",
  // Adhan notifications at the exact prayer time (@capacitor/local-notifications, src/lib/prayerNotifications.ts)
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
];

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let changed = 0;

/* ---------------- iOS ---------------- */
const APP_ID = "quran.muallem"; // must match capacitor.config.ts
const plistPath = "ios/App/App/Info.plist";
if (existsSync(plistPath)) {
  let plist = readFileSync(plistPath, "utf8");
  const insert = (xml) => { plist = plist.replace(/<\/dict>\s*<\/plist>\s*$/, `${xml}\n</dict>\n</plist>\n`); changed++; };
  for (const [key, value] of Object.entries(IOS_STRINGS)) {
    if (plist.includes(`<key>${key}</key>`)) {
      plist = plist.replace(new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`), `$1${escapeXml(value)}$2`);
    } else insert(`\t<key>${key}</key>\n\t<string>${escapeXml(value)}</string>`);
  }
  // Sheikh recitation keeps playing with the screen locked.
  if (!plist.includes("<key>UIBackgroundModes</key>")) insert("\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>audio</string>\n\t</array>");
  else if (!/<key>UIBackgroundModes<\/key>\s*<array>[\s\S]*?<string>audio<\/string>/.test(plist)) {
    plist = plist.replace(/(<key>UIBackgroundModes<\/key>\s*<array>)/, "$1\n\t\t<string>audio</string>"); changed++;
  }
  if (!plist.includes("<key>CFBundleLocalizations</key>")) {
    insert("\t<key>CFBundleLocalizations</key>\n\t<array>\n\t\t<string>ar</string>\n\t\t<string>en</string>\n\t</array>");
  }
  writeFileSync(plistPath, plist);
  console.log(`✓ iOS: ${plistPath}`);
}

// iPhone only (the layout is made for phones; iPad would also require 13-inch App Store screenshots).
// iPads still run the app in iPhone compatibility mode.
const pbxPath = "ios/App/App.xcodeproj/project.pbxproj";
if (existsSync(pbxPath)) {
  const pbx = readFileSync(pbxPath, "utf8");
  const next = pbx.replace(/TARGETED_DEVICE_FAMILY = "?[0-9,]+"?;/g, "TARGETED_DEVICE_FAMILY = 1;");
  if (next !== pbx) { writeFileSync(pbxPath, next); console.log("✓ iOS: iPhone only (TARGETED_DEVICE_FAMILY = 1)"); }
} else console.log("• iOS project not found (run `npx cap add ios` on a Mac) – skipped");

/* ---------------- Android ---------------- */
const manifestPath = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifestPath)) {
  let xml = readFileSync(manifestPath, "utf8");
  const missing = ANDROID_PERMISSIONS.filter((p) => !xml.includes(`"${p}"`));
  if (missing.length) {
    const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
    xml = xml.replace(/(\s*)<application/, `\n${lines}\n$1<application`);
    changed++;
  }
  if (!xml.includes('android:name="android.hardware.microphone"')) {
    xml = xml.replace(/(\s*)<application/, `\n    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n    <uses-feature android:name="android.hardware.sensor.compass" android:required="false" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />$1<application`);
    changed++;
  }
  // No advertising ID: the app shows no ads and has no login SDKs. Should any library ever add AD_ID to the
  // merged manifest, this removes it again.
  if (!xml.includes("xmlns:tools=")) xml = xml.replace("<manifest ", '<manifest xmlns:tools="http://schemas.android.com/tools" ');
  if (!xml.includes("com.google.android.gms.permission.AD_ID")) {
    xml = xml.replace(/(\s*)<application/, `\n    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />$1<application`);
    changed++;
  }
  // Background audio: the foreground service of the BackgroundAudio plugin.
  if (!xml.includes("BackgroundAudioService")) {
    xml = xml.replace(/(\s*)<\/application>/, `\n        <service android:name="${APP_ID}.BackgroundAudioService" android:exported="false" android:foregroundServiceType="mediaPlayback" />$1</application>`);
    changed++;
  }
  writeFileSync(manifestPath, xml);
  console.log(`✓ Android: ${manifestPath}`);
  const setString = (file, name, value) => {
    if (!existsSync(file)) return;
    let s = readFileSync(file, "utf8");
    s = s.includes(`name="${name}"`)
      ? s.replace(new RegExp(`(<string name="${name}"[^>]*>)[^<]*(</string>)`), `$1${escapeXml(value)}$2`)
      : s.replace("</resources>", `    <string name="${name}" translatable="false">${escapeXml(value)}</string>\n</resources>`);
    writeFileSync(file, s);
  };
  // MainActivity: older builds of this script added code for a login plugin that is no longer used – restore it.
  const pkgDir = "android/app/src/main/java/" + APP_ID.replace(/\./g, "/");
  const mainActivity = `${pkgDir}/MainActivity.java`;
  // Local plugin for background recitation playback: copy its sources and register it in MainActivity
  // (this also replaces the code an older version of this script added for a login plugin).
  if (existsSync(pkgDir)) {
    for (const f of ["BackgroundAudioPlugin.java", "BackgroundAudioService.java"]) copyFileSync(`native/android/${f}`, `${pkgDir}/${f}`);
    const wanted = `package ${APP_ID};\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(BackgroundAudioPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}\n`;
    if (!existsSync(mainActivity) || readFileSync(mainActivity, "utf8") !== wanted) {
      writeFileSync(mainActivity, wanted);
      console.log(`✓ Android: background audio plugin registered in ${mainActivity}`);
    }
  }

  // Version for the store: package.json "version" → versionName, "androidVersionCode" → versionCode
  // (Google Play needs a higher versionCode for every upload).
  const gradlePath = "android/app/build.gradle";
  if (existsSync(gradlePath)) {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    let g = readFileSync(gradlePath, "utf8");
    if (pkg.androidVersionCode) g = g.replace(/versionCode\s+\d+/, `versionCode ${pkg.androidVersionCode}`);
    if (pkg.version) g = g.replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
    writeFileSync(gradlePath, g);
    console.log(`✓ Android: versionCode ${pkg.androidVersionCode}, versionName ${pkg.version}`);
  }

  // Google Play requires target SDK 36. Capacitor 8 projects have it; warn about projects made with Capacitor 6/7.
  const vars = "android/variables.gradle";
  if (existsSync(vars)) {
    const m = readFileSync(vars, "utf8").match(/targetSdkVersion\s*=\s*(\d+)/);
    if (m && Number(m[1]) < 36) console.log(`⚠ Android: targetSdkVersion ${m[1]} < 36 – this android/ folder is from an older Capacitor. Delete android/ and run \`npx cap add android\`.`);
    else if (m) console.log(`✓ Android: targetSdkVersion ${m[1]}`);
  }
} else console.log("• Android project not found (run `npx cap add android`) – skipped");

/* ---------------- App name & icon ---------------- */
const APP_NAME = "Quran Muallem"; // label under the icon (full name is set in the store listings)
if (existsSync(plistPath)) {
  let plist = readFileSync(plistPath, "utf8");
  plist = plist.includes("<key>CFBundleDisplayName</key>")
    ? plist.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${APP_NAME}$2`)
    : plist.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>\n</dict>\n</plist>\n`);
  writeFileSync(plistPath, plist);
  const iconDir = "ios/App/App/Assets.xcassets/AppIcon.appiconset";
  if (existsSync(iconDir)) { copyFileSync("assets/native/ios/AppIcon-512@2x.png", `${iconDir}/AppIcon-512@2x.png`); console.log("✓ iOS: app icon"); }
}
const res = "android/app/src/main/res";
if (existsSync(res)) {
  const strings = `${res}/values/strings.xml`;
  if (existsSync(strings)) {
    let xml = readFileSync(strings, "utf8");
    for (const key of ["app_name", "title_activity_main"]) xml = xml.replace(new RegExp(`(<string name="${key}">)[^<]*(</string>)`), `$1${APP_NAME}$2`);
    writeFileSync(strings, xml);
  }
  for (const dir of readdirSync("assets/native/android")) {
    if (!existsSync(`${res}/${dir}`)) continue;
    for (const f of readdirSync(`assets/native/android/${dir}`)) copyFileSync(`assets/native/android/${dir}/${f}`, `${res}/${dir}/${f}`);
  }
  const bg = `${res}/values/ic_launcher_background.xml`;
  if (existsSync(bg)) writeFileSync(bg, readFileSync(bg, "utf8").replace(/(<color name="ic_launcher_background">)[^<]*(<\/color>)/, "$1#0B3A2D$2"));
  console.log(`✓ Android: app name „${APP_NAME}“ + icons`);
  // Adhan notification sounds: a channel's sound must be a raw resource (src/lib/prayerNotifications.ts).
  if (existsSync("public/adhan")) {
    mkdirSync(`${res}/raw`, { recursive: true });
    const sounds = readdirSync("public/adhan").filter((f) => f.endsWith(".mp3"));
    for (const f of sounds) copyFileSync(`public/adhan/${f}`, `${res}/raw/adhan_${f.toLowerCase().replace(/[^a-z0-9_.]/g, "_")}`);
    console.log(`✓ Android: ${sounds.length} Adhan sounds in res/raw`);
  }
}

console.log(changed ? "Native permissions updated." : "Native permissions already up to date.");
