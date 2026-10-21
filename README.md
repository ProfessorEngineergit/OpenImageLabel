# OpenImageLabel

Browser tool for adding camera and photo metadata labels to images. The static interface offers image selection, EXIF parsing and styling controls.

## Run

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. The entry point is `index.html`, with application logic in `main.js` and styles in `style.css`.

## Scope and dependencies

Small experimental photo-layout tool. EXIF availability depends on the selected image; missing metadata should not be treated as verified camera information. The page loads external fonts, icons, EXIF JavaScript and sample photos, so it requires network access for those resources. No browser-compatibility or performance guarantees are implied.

## Development and AI assistance

Small learning or experimental project developed with AI assistance. The default-branch history includes contributions explicitly attributed to GitHub Copilot / Google Jules ([example](https://github.com/ProfessorEngineergit/OpenImageLabel/commit/0189518ee08f7623afff4620f6ccbdba8356b2fb)). This documents AI involvement in those contributions; it does not establish the origin of every line or independent validation. Existing author, co-author and session records are retained.
