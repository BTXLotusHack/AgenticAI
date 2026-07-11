import sharp from 'sharp';
import { URL, fileURLToPath } from 'node:url';

const images = [
  {
    input: new URL('../public/images/loopin-hero.jpg', import.meta.url),
    outputs: [
      { file: 'loopin-hero-960.webp', width: 960 },
      { file: 'loopin-hero-1600.webp', width: 1600 },
    ],
  },
  {
    input: new URL('../public/images/loopin-convoy.jpg', import.meta.url),
    outputs: [
      { file: 'loopin-convoy-960.webp', width: 960 },
      { file: 'loopin-convoy-1600.webp', width: 1600 },
    ],
  },
];

await Promise.all(
  images.flatMap(({ input, outputs }) =>
    outputs.map(({ file, width }) =>
      sharp(fileURLToPath(input))
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ effort: 5, quality: 82, smartSubsample: true })
        .toFile(fileURLToPath(new URL(`../public/images/${file}`, import.meta.url))),
    ),
  ),
);
