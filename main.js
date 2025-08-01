'use strict';

// --- Globale Variablen und UI-Elemente ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('image-gallery');
const globalActions = document.getElementById('global-actions');
const downloadSelectedBtn = document.getElementById('download-selected-btn');
const downloadAllBtn = document.getElementById('download-all-btn');

let imageCollection = []; // Speichert den Zustand aller Bilder

// --- Event Listeners ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

downloadAllBtn.addEventListener('click', () => downloadImages(imageCollection));
downloadSelectedBtn.addEventListener('click', () => {
    const selected = imageCollection.filter(img => img.ui.checkbox.checked);
    downloadImages(selected);
});

// --- Hauptfunktionen ---
function handleFiles(files) {
    globalActions.style.display = 'block';
    for (const file of files) {
        if (file.type === 'image/jpeg') {
            createImageCard(file);
        }
    }
}

function createImageCard(file) {
    const imageId = `img-${Date.now()}-${Math.random()}`;
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
        <canvas></canvas>
        <div class="controls">
            <div class="control-group">
                <label><i class="fa-solid fa-text-height"></i> Größe</label>
                <input type="range" class="slider font-size-slider" min="10" max="100" value="30">
            </div>
            <div class="control-group">
                <label><i class="fa-solid fa-eye-dropper"></i> Deckkraft</label>
                <input type="range" class="slider transparency-slider" min="0" max="100" value="80">
            </div>
            <div class="card-actions">
                <div class="select-group">
                    <input type="checkbox" id="check-${imageId}">
                    <label for="check-${imageId}">Auswählen</label>
                </div>
                <a class="button download-single-btn">Speichern</a>
            </div>
        </div>`;
    gallery.appendChild(card);

    const imageState = {
        id: imageId,
        file: file,
        canvas: card.querySelector('canvas'),
        metadata: {},
        settings: { fontSize: 30, alpha: 0.8 },
        ui: {
            fontSizeSlider: card.querySelector('.font-size-slider'),
            transparencySlider: card.querySelector('.transparency-slider'),
            checkbox: card.querySelector(`#check-${imageId}`),
            downloadBtn: card.querySelector('.download-single-btn')
        }
    };
    imageCollection.push(imageState);

    // Event Listeners für die neuen UI-Elemente der Karte
    imageState.ui.fontSizeSlider.addEventListener('input', (e) => {
        imageState.settings.fontSize = parseInt(e.target.value);
        redrawCanvas(imageState);
    });
    imageState.ui.transparencySlider.addEventListener('input', (e) => {
        imageState.settings.alpha = parseInt(e.target.value) / 100;
        redrawCanvas(imageState);
    });
    imageState.ui.downloadBtn.addEventListener('click', () => downloadImages([imageState]));

    processImageFile(imageState);
}

function processImageFile(imageState) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
            imageState.originalImage = image; // Speichere das Originalbild
            EXIF.getData(image, function() {
                imageState.metadata = getFormattedMetadata(this);
                redrawCanvas(imageState);
            });
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(imageState.file);
}

function redrawCanvas(imageState) {
    const { canvas, originalImage, metadata, settings } = imageState;
    if (!originalImage) return;

    const ctx = canvas.getContext('2d');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);

    // Zeichne einen semi-transparenten Balken für besseren Kontrast
    const textHeight = (metadata.length + 0.5) * settings.fontSize * 1.2;
    ctx.fillStyle = `rgba(0, 0, 0, ${settings.alpha - 0.2})`;
    ctx.fillRect(0, canvas.height - textHeight, canvas.width, textHeight);

    // Text-Styling
    ctx.font = `700 ${settings.fontSize}px 'Inter', sans-serif`;
    ctx.textBaseline = 'bottom';
    const padding = settings.fontSize;
    let y = canvas.height - padding;

    // Zeichne jede Zeile
    metadata.slice().reverse().forEach(line => {
        ctx.fillStyle = `rgba(255, 255, 255, ${settings.alpha})`;
        ctx.fillText(line, padding, y);
        y -= settings.fontSize * 1.2;
    });
}

function getFormattedMetadata(exifData) {
    const tags = EXIF.getAllTags(exifData);
    let lines = [];

    // Kameramodell & Objektiv (Antwort auf deine iPhone-Frage)
    if (tags.Model) {
        let modelString = tags.Model;
        // iPhone-spezifische Logik: 'iPhone 11 Pro back triple camera 4.25mm f/1.8'
        // Der Name der Kamera (z.B. 'back triple camera') ist Teil des LensModel-Strings.
        if (tags.LensModel && tags.LensModel.includes(tags.Model)) {
            modelString = tags.LensModel; // Nutze den detaillierteren Namen
        } else if (tags.LensModel) {
            modelString += ` | ${tags.LensModel}`;
        }
        lines.push(modelString);
    }
    
    // Aufnahmeeinstellungen
    let settings = [];
    if (tags.FocalLength) settings.push(`${tags.FocalLength.numerator / tags.FocalLength.denominator}mm`);
    if (tags.FNumber) settings.push(`f/${tags.FNumber.numerator / tags.FNumber.denominator}`);
    if (tags.ExposureTime) {
        const et = tags.ExposureTime;
        settings.push(et.denominator === 1 ? `${et.numerator}s` : `${et.numerator}/${et.denominator}s`);
    }
    if (tags.ISOSpeedRatings) settings.push(`ISO ${tags.ISOSpeedRatings}`);
    if (settings.length > 0) lines.push(settings.join(' · '));

    // Weitere technische Daten
    let tech = [];
    if (tags.ExposureProgram) tech.push(tags.ExposureProgram);
    if (tags.MeteringMode) tech.push(tags.MeteringMode);
    if (tech.length > 0) lines.push(tech.join(' · '));

    // GPS-Daten
    if (tags.GPSLatitude && tags.GPSLongitude) {
        const lat = tags.GPSLatitude;
        const lon = tags.GPSLongitude;
        const latDec = lat[0] + (lat[1]/60) + (lat[2]/3600);
        const lonDec = lon[0] + (lon[1]/60) + (lon[2]/3600);
        lines.push(`GPS: ${latDec.toFixed(4)}° ${tags.GPSLatitudeRef}, ${lonDec.toFixed(4)}° ${tags.GPSLongitudeRef}`);
    }

    return lines;
}

function downloadImages(imagesToDownload) {
    imagesToDownload.forEach((imageState, index) => {
        const a = document.createElement('a');
        a.href = imageState.canvas.toDataURL('image/jpeg', 0.95);
        a.download = imageState.file.name.replace(/\.jpeg$|\.jpg$/i, '-OpenImageLabel.jpg');
        
        // Füge eine kleine Verzögerung hinzu, damit der Browser nicht überlastet wird
        setTimeout(() => a.click(), index * 200);
    });
}
