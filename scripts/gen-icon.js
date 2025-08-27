const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

async function main() {
  const projectRoot = __dirname ? path.join(__dirname, '..') : process.cwd();
  const srcSvg = path.join(projectRoot, 'images_default', 'watercup01.svg');
  const outDir = path.join(projectRoot, 'build');
  const outPng = path.join(outDir, 'icon.png');
  const outIcns = path.join(outDir, 'icon.icns');

  if (!fs.existsSync(srcSvg)) {
    console.error('Icon source not found:', srcSvg);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  await sharp(srcSvg)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPng);
  console.log('Icon PNG generated at:', outPng);

  try {
    const input = fs.readFileSync(outPng);
    const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0, false);
    if (icns && icns.length > 0) {
      fs.writeFileSync(outIcns, icns);
      console.log('Icon ICNS generated at:', outIcns);
    } else {
      console.warn('ICNS generation failed, DMG icon may fallback.');
    }
  } catch (e) {
    console.warn('ICNS generation error:', e.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


