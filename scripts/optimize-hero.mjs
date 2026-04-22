/**
 * Redimensiona el hero (ancho máx. 1920px) y guarda WebP en public/hero-negocio.webp.
 * Uso: npm run optimize:hero
 *      node scripts/optimize-hero.mjs [ruta/a/imagen.png|jpg|webp]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const defaultInput = path.join(root, "public", "hero-negocio.png");
const outputWebp = path.join(root, "public", "hero-negocio.webp");

const MAX_WIDTH = 1920;

const input =
  process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultInput;

if (!fs.existsSync(input)) {
  console.error("No existe la imagen de entrada:", input);
  console.error("Pasá una ruta como argumento o colocá public/hero-negocio.png");
  process.exit(1);
}

const meta = await sharp(input).metadata();
const inBytes = fs.statSync(input).size;
console.log("Entrada:", input, `${(inBytes / 1024).toFixed(1)} KiB`, `${meta.width}x${meta.height}`);

let pipeline = sharp(input).rotate();
if (meta.width && meta.width > MAX_WIDTH) {
  pipeline = pipeline.resize({
    width: MAX_WIDTH,
    withoutEnlargement: true,
  });
}

await pipeline.webp({ quality: 82, effort: 5, smartSubsample: true }).toFile(outputWebp);

const outBytes = fs.statSync(outputWebp).size;
console.log("Salida:", outputWebp, `${(outBytes / 1024).toFixed(1)} KiB`, `(${((100 * outBytes) / inBytes).toFixed(1)}% del PNG)`);
