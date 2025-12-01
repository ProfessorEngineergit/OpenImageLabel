'use strict';

const uploadContainer = document.getElementById('upload-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('image-gallery');
const globalActions = document.getElementById('global-actions');
const downloadSelectedBtn = document.getElementById('download-selected-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const backgroundPhotosContainer = document.getElementById('background-photos');

let imageCollection = [];
// NEU: Globale Variable zum Speichern des kopierten Stils
let copiedStyle = null;

// --- Background Photos System ---
// Pre-selected stock photos with labels (similar to the website's labeling style)
const stockPhotos = [
    {
        url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
        metadata: [
            { text: 'Sony A7III', color: 'red' },
            { text: 'Sony FE 24-70mm f/2.8 GM', color: 'white' },
            { text: '35mm  ·  f/2.8  ·  1/250s  ·  ISO 400', color: 'white' }
        ]
    },
    {
        url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
        metadata: [
            { text: 'Canon EOS R5', color: 'red' },
            { text: 'Canon RF 50mm f/1.2L USM', color: 'white' },
            { text: '50mm  ·  f/1.2  ·  1/500s  ·  ISO 100', color: 'white' }
        ]
    },
    {
        url: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800',
        metadata: [
            { text: 'Nikon Z6 II', color: 'red' },
            { text: 'Nikkor Z 85mm f/1.8 S', color: 'white' },
            { text: '85mm  ·  f/1.8  ·  1/1000s  ·  ISO 200', color: 'white' }
        ]
    },
    {
        url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
        metadata: [
            { text: 'Fujifilm X-T4', color: 'red' },
            { text: 'Fujinon XF 23mm f/1.4 R', color: 'white' },
            { text: '23mm  ·  f/1.4  ·  1/125s  ·  ISO 320', color: 'white' }
        ]
    },
    {
        url: 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=800',
        metadata: [
            { text: 'Leica Q2', color: 'red' },
            { text: 'Summilux 28mm f/1.7 ASPH', color: 'white' },
            { text: '28mm  ·  f/1.7  ·  1/320s  ·  ISO 100', color: 'white' }
        ]
    }
];

let backgroundPhotoPositions = [];

// Initialize background with stock photos
function initializeBackground() {
    stockPhotos.forEach((photo, index) => {
        addBackgroundPhoto(photo.url, photo.metadata, index * 300);
    });
}

// Add a photo to the background with random positioning
function addBackgroundPhoto(imageSource, metadata, delay = 0) {
    const container = document.createElement('div');
    container.className = 'background-photo';
    
    // Random size between 200-400px
    const size = 200 + Math.random() * 200;
    container.style.width = size + 'px';
    container.style.height = (size * 0.66) + 'px';
    
    // Find a random position that doesn't overlap too much with existing photos
    const position = getRandomPosition(size, size * 0.66);
    container.style.left = position.x + 'px';
    container.style.top = position.y + 'px';
    
    // Random rotation for natural look
    const rotation = -15 + Math.random() * 30;
    container.style.transform = `rotate(${rotation}deg)`;
    
    // Create canvas for labeled photo
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    backgroundPhotosContainer.appendChild(container);
    
    // Load and render the image with labels
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Apply labels similar to the main labeling function
        if (metadata && metadata.length > 0) {
            drawBackgroundLabels(ctx, canvas, metadata);
        }
        
        // Fade in with delay
        setTimeout(() => {
            container.classList.add('visible');
        }, delay);
    };
    
    img.onerror = () => {
        // If image fails to load, remove the container
        container.remove();
    };
    
    if (typeof imageSource === 'string') {
        img.src = imageSource;
    } else {
        // imageSource is already a data URL or Image object
        img.src = imageSource;
    }
}

// Draw labels on background photos
function drawBackgroundLabels(ctx, canvas, metadata) {
    const fontSize = canvas.width * 0.04;
    const padding = fontSize * 0.8;
    const lineHeight = fontSize * 1.3;
    const textStartX = padding;
    const maxWidth = canvas.width - (padding * 2);
    let textY = canvas.height - padding;
    
    ctx.textAlign = 'left';
    ctx.font = `700 ${fontSize}px 'Exo 2', sans-serif`;
    ctx.textBaseline = 'bottom';
    
    metadata.slice().reverse().forEach(line => {
        ctx.fillStyle = line.color === 'red' ? 'rgba(255, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(line.text, textStartX, textY);
        textY -= lineHeight;
    });
}

// Get a random position that avoids clustering
function getRandomPosition(width, height) {
    const maxAttempts = 50;
    const margin = 50;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = margin + Math.random() * (viewportWidth - width - margin * 2);
        const y = margin + Math.random() * (viewportHeight - height - margin * 2);
        
        // Check if this position overlaps significantly with existing photos
        let overlaps = false;
        for (const pos of backgroundPhotoPositions) {
            const overlapX = Math.abs(x - pos.x) < (width + pos.width) * 0.5;
            const overlapY = Math.abs(y - pos.y) < (height + pos.height) * 0.5;
            if (overlapX && overlapY) {
                overlaps = true;
                break;
            }
        }
        
        if (!overlaps) {
            backgroundPhotoPositions.push({ x, y, width, height });
            return { x, y };
        }
    }
    
    // If no non-overlapping position found, return a random position anyway
    const x = margin + Math.random() * (viewportWidth - width - margin * 2);
    const y = margin + Math.random() * (viewportHeight - height - margin * 2);
    backgroundPhotoPositions.push({ x, y, width, height });
    return { x, y };
}

// Add uploaded image to background after processing
function addUploadedImageToBackground(imageState) {
    // Wait a bit for the canvas to be fully rendered
    setTimeout(() => {
        if (imageState.canvas && imageState.originalImage) {
            // Get the canvas data URL
            const dataUrl = imageState.canvas.toDataURL('image/jpeg', 0.8);
            // Add to background with a slight delay for visual effect
            addBackgroundPhoto(dataUrl, null, 500);
        }
    }, 1000);
}

// Initialize background on page load
document.addEventListener('DOMContentLoaded', initializeBackground);

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
                <button class="button copy-style-btn"><i class="fa-solid fa-copy"></i> Stil kopieren</button>
                <button class="button paste-style-btn"><i class="fa-solid fa-paste"></i> Stil einsetzen</button>
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
        imageState.ui.copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Kopiert!';
        setTimeout(() => { imageState.ui.copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Stil kopieren'; }, 1000);
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
                // NEU: Füge das hochgeladene Bild zum Hintergrund hinzu
                addUploadedImageToBackground(imageState);
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
