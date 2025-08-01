'use strict';

// --- Globale Variablen und UI-Elemente ---
const uploadContainer = document.getElementById('upload-container');
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


// --- Kernlogik ---

function handleFiles(files) {
    if (files.length === 0) return;
    uploadContainer.classList.add('hidden');
    globalActions.style.display = 'block';
    for (const file of files) {
        if (file.type === 'image/jpeg') {
            createImageCard(file);
        }
    }
}

function createImageCard(file) {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const imageId = `img-${Date.now()}-${randomSuffix}`;
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
        <div class="canvas-container">
            <div class="placeholder"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <canvas></canvas>
        </div>
        <div class="controls">
            <div class="control-group">
                <label><i class="fa-solid fa-text-height"></i> Größe</label>
                <input type="range" class="slider font-size-slider" min="10" max="100" value="30">
            </div>
            <div class="control-group">
                <label><i class="fa-solid fa-eye-dropper"></i> Deckkraft</label>
                <input type="range" class="slider transparency-slider" min="0" max="100" value="90">
            </div>
            <div class="card-actions">
                <label class="select-group">
                    <input type="checkbox" class="select-checkbox" id="check-${imageId}">
                    <span>Auswählen</span>
                </label>
            </div>
        </div>`;
    gallery.appendChild(card);

    const imageState = {
        id: imageId,
        file: file,
        canvas: card.querySelector('canvas'),
        placeholder: card.querySelector('.placeholder'),
        metadata: [],
        settings: { fontSize: 30, alpha: 0.9 },
        ui: {
            fontSizeSlider: card.querySelector('.font-size-slider'),
            transparencySlider: card.querySelector('.transparency-slider'),
            checkbox: card.querySelector(`#check-${imageId}`),
        }
    };
    imageCollection.push(imageState);

    imageState.ui.fontSizeSlider.addEventListener('input', (e) => {
        imageState.settings.fontSize = parseInt(e.target.value);
        redrawCanvas(imageState);
    });
    imageState.ui.transparencySlider.addEventListener('input', (e) => {
        imageState.settings.alpha = parseInt(e.target.value) / 100;
        redrawCanvas(imageState);
    });
    imageState.ui.checkbox.addEventListener('change', updateGlobalButtonState);

    processImage(imageState);
}

function processImage(imageState) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
            imageState.originalImage = image;
            imageState.canvas.width = image.width;
            imageState.canvas.height = image.height;
            imageState.canvas.parentElement.style.paddingTop = `${(image.height / image.width) * 100}%`;
            EXIF.getData(image, function() {
                imageState.metadata = getFormattedMetadata(this);
                redrawCanvas(imageState);
                imageState.placeholder.style.display = 'none';
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    if (metadata.length === 0) return;

    const fontSize = canvas.width * (settings.fontSize / 1000);
    const padding = fontSize * 1.2;
    const lineHeight = fontSize * 1.3;

    // HIER IST DIE ÄNDERUNG: Kein Hintergrundbalken mehr.
    // Stattdessen fügen wir einen Textschatten für die Lesbarkeit hinzu.
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = fontSize / 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = fontSize / 20;

    // Text-Styling
    ctx.font = `700 ${fontSize}px 'Exo 2', sans-serif`; // Neue Schriftart
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(255, 255, 255, ${settings.alpha})`;
    let y = canvas.height - padding;

    metadata.slice().reverse().forEach(line => {
        ctx.fillText(line.text, padding, y, canvas.width - (padding * 2));
        y -= lineHeight;
    });
}

function getFormattedMetadata(exifData) {
    const tags = EXIF.getAllTags(exifData);
    let lines = [];
    let modelString = tags.Model || 'Unbekannte Kamera';
    if (tags.LensModel) {
        lines.push({ text: tags.LensModel });
    } else {
        lines.push({ text: modelString });
    }
    let settings = [];
    if (tags.FocalLength) settings.push(`${tags.FocalLength}mm`);
    if (tags.FNumber) settings.push(`f/${tags.FNumber}`);
    if (tags.ExposureTime) {
        const et = tags.ExposureTime;
        settings.push(et < 1 ? `1/${Math.round(1/et)}s` : `${et}s`);
    }
    if (tags.ISOSpeedRatings) settings.push(`ISO ${tags.ISOSpeedRatings}`);
    if (settings.length > 0) lines.push({ text: settings.join(' · ') });
    if (tags.DateTimeOriginal) lines.push({ text: tags.DateTimeOriginal.split(" ")[0].replace(/:/g, '-') });

    return lines;
}

function updateGlobalButtonState() {
    const anySelected = imageCollection.some(img => img.ui.checkbox.checked);
    downloadSelectedBtn.disabled = !anySelected;
}

function downloadImages(imagesToDownload) {
    if (imagesToDownload.length === 0) {
        alert("Bitte wähle zuerst Bilder für den Download aus.");
        return;
    }
    imagesToDownload.forEach((imageState, index) => {
        const a = document.createElement('a');
        a.href = imageState.canvas.toDataURL('image/jpeg', 0.95);
        a.download = imageState.file.name.replace(/\.jpeg$|\.jpg$/i, '-OpenImageLabel.jpg');
        setTimeout(() => a.click(), index * 200);
    });
}
