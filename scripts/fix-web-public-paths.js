/**
 * Expo PWA uses path.join as a fallback when joining public paths on Windows,
 * which produces backslash hrefs (e.g. "\favicon-16.png") that browsers ignore.
 * Chrome manifest icons are also generated here when the webpack plugin misses them.
 */
const fs = require('fs');
const path = require('path');
const { generateChromeIconAsync, getChromeIconConfig } = require('expo-pwa');
const { getConfig } = require('expo/config');

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'web-build');

function toWebPath(value) {
  return value.replace(/\\/g, '/').replace(/^\/?/, '/');
}

function fixHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const html = fs.readFileSync(filePath, 'utf8');
  const fixed = html.replace(/href="([^"]+)"/g, (match, href) => {
    if (!href.includes('\\')) return match;
    return `href="${toWebPath(href)}"`;
  });

  if (fixed !== html) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed public paths in ${path.basename(filePath)}`);
  }
}

async function ensureManifestIcons() {
  const manifestPath = path.join(buildDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (Array.isArray(manifest.icons) && manifest.icons.length > 0) {
    manifest.icons = manifest.icons.map((icon) => ({
      ...icon,
      src: typeof icon.src === 'string' ? toWebPath(icon.src) : icon.src,
    }));
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  const { exp } = getConfig(projectRoot);
  const icon = getChromeIconConfig(exp);
  if (!icon) return;

  const assets = await generateChromeIconAsync(
    { projectRoot, publicPath: '/' },
    icon,
    {}
  );

  for (const asset of assets) {
    const outPath = path.join(buildDir, asset.asset.path.replace(/\\/g, path.sep));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, asset.asset.source);
  }

  manifest.icons = assets.map((asset) => ({
    ...asset.manifest,
    src: toWebPath(asset.manifest.src),
  }));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Added PWA manifest icons');
}

async function main() {
  fixHtmlFile(path.join(buildDir, 'index.html'));
  await ensureManifestIcons();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
