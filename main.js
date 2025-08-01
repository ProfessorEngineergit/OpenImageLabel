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
    toggleSelectionMode(true);
});

// --- Kernlogik ---
function handleFiles(files) {
    if (files.length === 0) return;
    uploadContainer.classList.add('hidden');
    globalActions.style.display = 'flex';
    for (const file of files) {
        if (file.type === 'image/jpeg') createImageCard(file);
    }
}

function createImageCard(file) {
    const imageId = `card-${Math.random().toString(36).substr(2, 9)}`;
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = imageId;
    card.innerHTML = `
        <div class="selection-indicator"><i class="fa-solid fa-check"></i></div>
        <div class="image-card-inner">
            <div class="canvas-container"><canvas></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <i class="fa-solid fa-text-height"></i>
                    <input type="range" class="slider font-size-slider" min="10" max="100" value="55">
                </div>
                <div class="control-group">
                    <i class="fa-solid fa-eye-dropper"></i>
                    <input type="range" class="slider transparency-slider" min="0" max="100" value="95">
                </div>
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
        settings: { fontSize: 55, alpha: 0.95 },
        ui: {
            fontSizeSlider: card.querySelector('.font-size-slider'),
            transparencySlider: card.querySelector('.transparency-slider'),
        }
    };
    imageCollection.push(imageState);

    // KORRIGIERTER AUSWAHL-LISTENER
    card.addEventListener('click', () => {
        if (isSelectionModeActive) {
            imageState.isSelected = !imageState.isSelected;
            card.classList.toggle('selected', imageState.isSelected);
            updateGlobalButtonState();
        }
    });

    imageState.ui.fontSizeSlider.addEventListener('input', (e) => { imageState.settings.fontSize = parseInt(e.target.value); redrawCanvas(imageState); });
    imageState.ui.transparencySlider.addEventListener('input', (e) => { imageState.settings.alpha = parseInt(e.target.value) / 100; redrawCanvas(imageState); });
    
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
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * 2; // Erhöhe Auflösung für schärferen Text
    canvas.height = container.clientHeight * 2;
    ctx.scale(2, 2); // Skaliere den Kontext

    // Letterboxing
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const hRatio = container.clientWidth / originalImage.width;
    const vRatio = container.clientHeight / originalImage.height;
    const ratio = Math.min(hRatio, vRatio);
    const newWidth = originalImage.width * ratio;
    const newHeight = originalImage.height * ratio;
    const x = (container.clientWidth - newWidth) / 2;
    const y = (container.clientHeight - newHeight) / 2;
    ctx.drawImage(originalImage, x, y, newWidth, newHeight);
    
    // KORRIGIERTE TEXT-LOGIK
    if (metadata.length === 0) return;
    const fontSize = container.clientWidth * (settings.fontSize / 1000);
    const padding = fontSize;
    const lineHeight = fontSize * 1.3;
    
    ctx.font = `700 ${fontSize}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    // Leichter Schatten für Lesbarkeit, kein hässlicher Rand
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 5;

    let textY = container.clientHeight - padding;
    metadata.slice().reverse().forEach(line => {
        ctx.fillStyle = line.color === 'red' ? `rgba(255, 0, 0, ${settings.alpha})` : `rgba(255, 255, 255, ${settings.alpha})`;
        ctx.fillText(line.text, padding, textY);
        textY -= lineHeight;
    });
}

function getFormattedMetadata(exifData) {
    const tags = EXIF.getAllTags(exifData);
    let lines = [];
    lines.push({ text: tags.Model || 'Unbekannte Kamera', color: 'red' });
    if (tags.LensModel) lines.push({ text: tags.LensModel, color: 'white' });
    let settings = [];
    if (tags.FocalLength) settings.push(`${tags.FocalLength}mm`);
    if (tags.FNumber) settings.push(`f/${tags.FNumber}`);
    if (tags.ExposureTime) { const et = tags.ExposureTime; settings.push(et < 1 ? `1/${Math.round(1/et)}s` : `${et}s`); }
    if (tags.ISOSpeedRatings) settings.push(`ISO ${tags.ISOSpeedRatings}`);
    if (settings.length > 0) lines.push({ text: settings.join('  ·  '), color: 'white' });
    return lines;
}

function toggleSelectionMode(forceOff = false) {
    isSelectionModeActive = forceOff ? false : !isSelectionModeActive;
    appContainer.classList.toggle('selection-active', isSelectionModeActive);
    selectionModeBtn.innerHTML = isSelectionModeActive ? '<i class="fa-solid fa-xmark"></i> Auswahl beenden' : '<i class="fa-solid fa-check-to-slot"></i> Bilder auswählen';
    if (!isSelectionModeActive) {
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
    const text = selectedCount > 0 ? `Auswahl (${selectedCount})` : 'Auswahl';
    downloadSelectedBtn.innerHTML = `<i class="fa-solid fa-download"></i> ${text} herunterladen`;
}

function downloadImages(imagesToDownload) {
    if (imagesToDownload.length === 0) return;
    imagesToDownload.forEach((state, i) => {
        const a = document.createElement('a');
        const hiresCanvas = document.createElement('canvas');
        state.canvas = hiresCanvas; // Temporär das hochauflösende Canvas nutzen
        redrawCanvas(state); // Neu zeichnen in voller Auflösung
        a.href = hiresCanvas.toDataURL('image/jpeg', 0.95);
        a.download = state.file.name.replace(/\.jpeg$|\.jpg$/i, '-OpenImageLabel.jpg');
        setTimeout(() => a.click(), i * 200);
    });
}
