'use strict';

// --- Globale Variablen und UI-Elemente ---
const appContainer = document.getElementById('app-container');
const uploadContainer = document.getElementById('upload-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('image-gallery');
const globalActions = document.getElementById('global-actions');
const selectionModeBtn = document.getElementById('selection-mode-btn');
const downloadSelectedBtn = document.getElementById('download-selected-btn');

let imageCollection = [];
let isSelectionModeActive = false;
let copiedStyle = null;

// --- Event Listeners ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

selectionModeBtn.addEventListener('click', toggleSelectionMode);
downloadSelectedBtn.addEventListener('click', () => {
    const selected = imageCollection.filter(img => img.isSelected);
    downloadImages(selected);
    toggleSelectionMode(true); // Auswahlmodus nach Download beenden
});

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
        <div class="selection-overlay"><i class="fa-solid fa-check"></i></div>
        <div class="canvas-container"><canvas></canvas></div>
        <div class="controls">
            <div class="control-group">
                <i class="fa-solid fa-text-height"></i>
                <input type="range" class="slider font-size-slider" min="10" max="100" value="40">
            </div>
            <div class="control-group">
                <i class="fa-solid fa-eye-dropper"></i>
                <input type="range" class="slider transparency-slider" min="0" max="100" value="90">
            </div>
            <div class="card-actions">
                <button class="button copy-style-btn"><i class="fa-solid fa-copy"></i> Stil kopieren</button>
                <button class="button paste-style-btn"><i class="fa-solid fa-paste"></i> Einsetzen</button>
                <button class="button apply-all-btn"><i class="fa-solid fa-share-nodes"></i> Auf alle</button>
            </div>
        </div>`;
    gallery.appendChild(card);

    const imageState = {
        id: imageId,
        file: file,
        isSelected: false,
        cardElement: card,
        canvas: card.querySelector('canvas'),
        metadata: [],
        settings: { fontSize: 40, alpha: 0.9 },
        ui: {
            fontSizeSlider: card.querySelector('.font-size-slider'),
            transparencySlider: card.querySelector('.transparency-slider'),
            copyBtn: card.querySelector('.copy-style-btn'),
            pasteBtn: card.querySelector('.paste-style-btn'),
            applyAllBtn: card.querySelector('.apply-all-btn'),
        }
    };
    imageCollection.push(imageState);

    // Event Listeners für die Karte
    card.addEventListener('click', () => {
        if (isSelectionModeActive) {
            imageState.isSelected = !imageState.isSelected;
            card.classList.toggle('selected', imageState.isSelected);
            updateGlobalButtonState();
        }
    });

    imageState.ui.fontSizeSlider.addEventListener('input', (e) => { imageState.settings.fontSize = parseInt(e.target.value); redrawCanvas(imageState); });
    imageState.ui.transparencySlider.addEventListener('input', (e) => { imageState.settings.alpha = parseInt(e.target.value) / 100; redrawCanvas(imageState); });
    imageState.ui.copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copiedStyle = { ...imageState.settings }; });
    imageState.ui.pasteBtn.addEventListener('click', (e) => { e.stopPropagation(); if (copiedStyle) { imageState.settings = { ...copiedStyle }; updateControls(imageState); redrawCanvas(imageState); } });
    imageState.ui.applyAllBtn.addEventListener('click', (e) => { e.stopPropagation(); imageCollection.forEach(img => { if (img.id !== imageState.id) { img.settings = { ...imageState.settings }; updateControls(img); redrawCanvas(img); } }); });

    processImage(imageState);
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

    // Letterboxing-Logik
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const hRatio = canvas.width / originalImage.width;
    const vRatio = canvas.height / originalImage.height;
    const ratio = Math.min(hRatio, vRatio);
    const centerShift_x = (canvas.width - originalImage.width * ratio) / 2;
    const centerShift_y = (canvas.height - originalImage.height * ratio) / 2;
    ctx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height, centerShift_x, centerShift_y, originalImage.width * ratio, originalImage.height * ratio);
    
    // Textzeichnen
    if (metadata.length === 0) return;

    const fontSize = canvas.width * (settings.fontSize / 1500); // Feinere Skalierung
    const padding = fontSize * 1.5;
    const lineHeight = fontSize * 1.2;
    ctx.font = `700 ${fontSize}px 'Exo 2', sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = fontSize / 3;

    let y = canvas.height - padding;
    metadata.slice().reverse().forEach(line => {
        ctx.fillStyle = line.color === 'red' ? `rgba(229, 57, 53, ${settings.alpha})` : `rgba(255, 255, 255, ${settings.alpha})`;
        ctx.fillText(line.text, padding, y, canvas.width - (padding * 2));
        y -= lineHeight;
    });
}

function getFormattedMetadata(exifData) {
    const tags = EXIF.getAllTags(exifData);
    let lines = [];
    let modelString = tags.Model || 'Unbekannte Kamera';
    // Rote Farbe für die erste Zeile
    lines.push({ text: modelString, color: 'red' });
    if (tags.LensModel) { lines.push({ text: tags.LensModel, color: 'white' }); }
    
    let settings = [];
    if (tags.FocalLength) settings.push(`${tags.FocalLength}mm`);
    if (tags.FNumber) settings.push(`f/${tags.FNumber}`);
    if (tags.ExposureTime) { const et = tags.ExposureTime; settings.push(et < 1 ? `1/${Math.round(1/et)}s` : `${et}s`); }
    if (tags.ISOSpeedRatings) settings.push(`ISO ${tags.ISOSpeedRatings}`);
    if (settings.length > 0) lines.push({ text: settings.join('  ·  '), color: 'white' });

    return lines;
}

function updateControls(imageState) {
    imageState.ui.fontSizeSlider.value = imageState.settings.fontSize;
    imageState.ui.transparencySlider.value = imageState.settings.alpha * 100;
}

function toggleSelectionMode(forceOff = false) {
    isSelectionModeActive = forceOff ? false : !isSelectionModeActive;
    appContainer.classList.toggle('selection-active', isSelectionModeActive);
    
    // Alle Karten als auswählbar markieren/demarkieren
    imageCollection.forEach(img => img.cardElement.classList.toggle('selectable', isSelectionModeActive));
    
    if (!isSelectionModeActive) {
        // Auswahl zurücksetzen, wenn der Modus beendet wird
        imageCollection.forEach(img => {
            img.isSelected = false;
            img.cardElement.classList.remove('selected');
        });
    }
    updateGlobalButtonState();
}

function updateGlobalButtonState() {
    const selectedCount = imageCollection.filter(img => img.isSelected).length;
    downloadSelectedBtn.disabled = selectedCount === 0;
    downloadSelectedBtn.textContent = selectedCount > 0 ? `Auswahl (${selectedCount}) herunterladen` : 'Auswahl herunterladen';
}

function downloadImages(imagesToDownload) {
    if (imagesToDownload.length === 0) return;
    imagesToDownload.forEach((state, i) => {
        const a = document.createElement('a');
        a.href = state.canvas.toDataURL('image/jpeg', 0.95);
        a.download = state.file.name.replace(/\.jpeg$|\.jpg$/i, '-OpenImageLabel.jpg');
        setTimeout(() => a.click(), i * 200);
    });
}
