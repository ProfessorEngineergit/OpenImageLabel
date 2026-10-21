# OpenImageLabel

Browser tool for adding camera and photo metadata labels to images. The static interface offers image selection, EXIF parsing and styling controls.

## Run

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. The entry point is `index.html`, with application logic in `main.js` and styles in `style.css`.

## Scope and dependencies

Small experimental photo-layout tool. EXIF availability depends on the selected image; missing metadata should not be treated as verified camera information. The page loads external fonts, icons, EXIF JavaScript and sample photos, so it requires network access for those resources. No browser-compatibility or performance guarantees are implied.

## AI assistance

Some code contributions are explicitly attributed to AI tools: [GitHub Copilot](https://github.com/ProfessorEngineergit/OpenImageLabel/commit/f168333596a92621cc70fcaf5202ec93b5998ffc), [Google Jules](https://github.com/ProfessorEngineergit/OpenImageLabel/commit/5623ae1b215e3e50746fa4f5f780b7db10482f0b). This applies to those contributions, not every file.
