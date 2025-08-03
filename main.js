'use strict';

const uploadContainer = document.getElementById('upload-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('image-gallery');
const globalActions = document.getElementById('global-actions');
const downloadSelectedBtn = document.getElementById('download-selected-btn');
const downloadAllBtn = document.getElementById('download-all-btn');

let imageCollection = [];
// NEU: Globale Variable zum Speichern des kopierten Stils
let copiedStyle = null;

// --- Event Listeners ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

downloadSelectedBtn.addEventListener('click', () => {
    const selected = imageCollection.filter(img => img.isSelected);
    downloadImages(selected);
});

downloadAllBtn.addEventListener('click', () => downloadImages(imageCollection));

// --- Kernlogik ---

function handleFiles(files) {
    if (files.length === 0) return;
    uploadContainer.classList.add('hidden');
    globalActions.style.display = 'flex';
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
    card.id = imageId;
    card.innerHTML = `
        <div class="canvas-container"><canvas></canvas></div>
        <div class="controls">
            <div class="control-group">
                <i class="fa-solid fa-text-height"></i>
                <input type="range" class="slider font-size-slider" min="10" max="100" value="50">
            </div>
            <div class="control-group">
                <i class="fa-solid fa-circle-half-stroke"></i>
                <input type="range" class="slider transparency-slider" min="0" max="100" value="95">
            </div>
            <!-- NEU: Die Stil-Aktions-Buttons -->
            <div class="style-actions">
                <button class="button copy-style-btn"><i class="fa-solid fa-copy"></i> Kopieren</button>
                <button class="button paste-style-btn"><i class="fa-solid fa-paste"></i> Einsetzen</button>
                <button class="button apply-all-btn"><i class="fa-solid fa-share-nodes"></i> Auf alle anwenden</button>
            </div>
            <div class="selection-group">
                <input type="checkbox" class="selection-checkbox" id="check-${imageId}">
                <label for="check-${imageId}">Für Download auswählen</label>
            </div>
        </div>`;
    gallery.appendChild(card);

    const imageState = {
        id: imageId, file, isSelected: false, cardElement: card,
        canvas: card.querySelector('canvas'),
        metadata: [],
        settings: { fontSize: 50, alpha: 0.95 },
        ui: {
            fontSizeSlider: card.querySelector('.font-size-slider'),
            transparencySlider: card.querySelector('.transparency-slider'),
            checkbox: card.querySelector('.selection-checkbox'),
            // NEU: Referenzen zu den neuen Buttons
            copyBtn: card.querySelector('.copy-style-btn'),
            pasteBtn: card.querySelector('.paste-style-btn'),
            applyAllBtn: card.querySelector('.apply-all-btn'),
        }
    };
    imageCollection.push(imageState);

    // Event-Listener für die neuen Buttons
    imageState.ui.copyBtn.addEventListener('click', () => {
        // Speichert eine Kopie der aktuellen Einstellungen in der globalen Variable
        copiedStyle = { ...imageState.settings };
        // Visuelles Feedback (optional, aber nützlich)
        imageState.ui.copyBtn.textContent = 'Kopiert!';
        setTimeout(() => { imageState.ui.copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Kopieren'; }, 1000);
    });

    imageState.ui.pasteBtn.addEventListener('click', () => {
        if (copiedStyle) {
            // Überschreibt die Einstellungen der Karte mit dem kopierten Stil
            imageState.settings = { ...copiedStyle };
            // Aktualisiert die Slider-Positionen, um die neuen Werte anzuzeigen
            updateControls(imageState);
            // Zeichnet das Canvas neu mit den neuen Einstellungen
            redrawCanvas(imageState);
        }
    });

    imageState.ui.applyAllBtn.addEventListener('click', () => {
        // Geht durch ALLE Bilder in der Sammlung
        imageCollection.forEach(img => {
            // Überschreibt die Einstellungen jedes Bildes
            img.settings = { ...imageState.settings };
            // Aktualisiert die Slider jedes Bildes
            updateControls(img);
            // Zeichnet jedes Canvas neu
            redrawCanvas(img);
        });
    });

    imageState.ui.checkbox.addEventListener('change', () => {
        imageState.isSelected = imageState.ui.checkbox.checked;
        imageState.cardElement.classList.toggle('selected', imageState.isSelected);
        updateGlobalButtonState();
    });

    imageState.ui.fontSizeSlider.addEventListener('input', (e) => { imageState.settings.fontSize = parseInt(e.target.value); redrawCanvas(imageState); });
    imageState.ui.transparencySlider.addEventListener('input', (e) => { imageState.settings.alpha = parseInt(e.target.value) / 100; redrawCanvas(imageState); });
    
    processImage(imageState);
}

// NEU: Hilfsfunktion, um die Slider einer Karte zu aktualisieren
function updateControls(imageState) {
    imageState.ui.fontSizeSlider.value = imageState.settings.fontSize;
    imageState.ui.transparencySlider.value = imageState.settings.alpha * 100;
}

function processImage(imageState) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
            imageState.originalImage = image;
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
    if (metadata.length === 0) return;
    const fontSize = canvas.width * (settings.fontSize / 1200);
    const padding = fontSize * 0.8;
    const lineHeight = fontSize * 1.3;
    const textStartX = padding;
    const maxWidth = canvas.width - (padding * 2);
    let textY = canvas.height - padding;
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left'; 
    ctx.font = `700 ${fontSize}px 'Exo 2', sans-serif`;
    ctx.textBaseline = 'bottom';
    metadata.slice().reverse().forEach(line => {
        ctx.fillStyle = line.color === 'red' ? `rgba(255, 0, 0, ${settings.alpha})` : `rgba(255, 255, 255, ${settings.alpha})`;
        textY = wrapText(ctx, line.text, textStartX, textY, maxWidth, lineHeight);
    });
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split(' ');
    let line = '';
    let lines = [];
    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    for(let i = lines.length - 1; i >= 0; i--) {
        context.fillText(lines[i].trim(), x, y);
        y -= lineHeight;
    }
    return y;
}

function getFormattedMetadata(exifData) {
    const tags = EXIF.getAllTags(exifData);
    let lines = [];
    lines.push({ text: tags.Model || 'Unbekannte Kamera', color: 'red' });
    if (tags.LensModel) { lines.push({ text: tags.LensModel, color: 'white' }); }
    let settings = [];
    if (tags.FocalLength) settings.push(`${tags.FocalLength}mm`);
    if (tags.FNumber) settings.push(`f/${tags.FNumber}`);
    if (tags.ExposureTime) { const et = tags.ExposureTime; settings.push(et < 1 ? `1/${Math.round(1/et)}s` : `${et}s`); }
    if (tags.ISOSpeedRatings) settings.push(`ISO ${tags.ISOSpeedRatings}`);
    if (settings.length > 0) lines.push({ text: settings.join('  ·  '), color: 'white' });
    return lines;
}

function updateGlobalButtonState() {
    const selectedCount = imageCollection.filter(img => img.isSelected).length;
    downloadSelectedBtn.disabled = selectedCount === 0;
    const text = selectedCount > 0 ? `Auswahl (${selectedCount})` : 'Auswahl';
    downloadSelectedBtn.innerHTML = `<i class="fa-solid fa-download"></i> ${text} herunterladen`;
}

function downloadImages(imagesToDownload) {
    if (imagesToDownload.length === 0) return;
    imagesToDownload.forEach((state, i) => {
        const a = document.createElement('a');
        a.href = state.canvas.toDataURL('image/jpeg', 1.0);
        a.download = state.file.name.replace(/\.jpeg$|\.jpg$/i, '-OpenImageLabel.jpg');
        setTimeout(() => a.click(), i * 200);
    });
}
