'use strict';

const uploadContainer = document.getElementById('upload-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('image-gallery');
const globalActions = document.getElementById('global-actions');
const downloadSelectedBtn = document.getElementById('download-selected-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const dynamicBackgroundContainer = document.getElementById('dynamic-background-container');
const stickyHeaderWrapper = document.querySelector('.sticky-header-wrapper');

let imageCollection = [];
// NEU: Globale Variable zum Speichern des kopierten Stils
let copiedStyle = null;

// =======================================================
// STOCK PHOTOS FOR INITIAL BACKGROUND
// =======================================================
const stockPhotos = [
    {
        url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm f/2.8L',
        settings: '35mm · f/2.8 · 1/250s · ISO 100'
    },
    {
        url: 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=400',
        camera: 'Sony A7R IV',
        lens: 'FE 85mm f/1.4 GM',
        settings: '85mm · f/1.4 · 1/500s · ISO 200'
    },
    {
        url: 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=400',
        camera: 'Nikon Z9',
        lens: 'NIKKOR Z 70-200mm f/2.8',
        settings: '135mm · f/2.8 · 1/1000s · ISO 400'
    },
    {
        url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
        camera: 'Fujifilm X-T5',
        lens: 'XF 56mm f/1.2 R',
        settings: '56mm · f/1.2 · 1/320s · ISO 160'
    },
    {
        url: 'https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?w=400',
        camera: 'Leica Q3',
        lens: 'Summilux 28mm f/1.7',
        settings: '28mm · f/1.7 · 1/125s · ISO 100'
    }
];

// =======================================================
// DYNAMIC BACKGROUND FUNCTIONALITY
// =======================================================
function getRandomPosition() {
    return {
        x: Math.random() * 80 + 5, // 5-85% from left
        y: Math.random() * 70 + 10, // 10-80% from top
        rotation: (Math.random() - 0.5) * 20, // -10 to 10 degrees
        size: Math.random() * 80 + 120 // 120-200px width
    };
}

function createBackgroundPhoto(imageSrc, labelData, delay = 0) {
    const pos = getRandomPosition();
    
    const photoEl = document.createElement('div');
    photoEl.className = 'background-photo';
    photoEl.style.left = `${pos.x}%`;
    photoEl.style.top = `${pos.y}%`;
    photoEl.style.width = `${pos.size}px`;
    photoEl.style.transform = `rotate(${pos.rotation}deg)`;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Background photo';
    
    const label = document.createElement('div');
    label.className = 'photo-label';
    label.innerHTML = `
        <span class="camera">${labelData.camera}</span>
        ${labelData.lens ? `<span class="lens">${labelData.lens}</span>` : ''}
        ${labelData.settings ? `<span class="settings">${labelData.settings}</span>` : ''}
    `;
    
    photoEl.appendChild(img);
    photoEl.appendChild(label);
    dynamicBackgroundContainer.appendChild(photoEl);
    
    // Fade in with delay
    setTimeout(() => {
        photoEl.classList.add('visible');
    }, delay);
    
    return photoEl;
}

function initStockPhotos() {
    stockPhotos.forEach((photo, index) => {
        createBackgroundPhoto(photo.url, {
            camera: photo.camera,
            lens: photo.lens,
            settings: photo.settings
        }, index * 400 + 500); // Stagger the fade-in
    });
}

// Maximum number of background photos to prevent memory issues
const MAX_BACKGROUND_PHOTOS = 15;
let backgroundPhotoCount = 0;

function addUploadedPhotoToBackground(imageState) {
    if (!imageState.originalImage) return;
    
    // Limit the number of background photos
    if (backgroundPhotoCount >= MAX_BACKGROUND_PHOTOS) return;
    backgroundPhotoCount++;
    
    // Create a smaller version for background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const maxSize = 400;
    const ratio = Math.min(maxSize / imageState.originalImage.width, maxSize / imageState.originalImage.height);
    tempCanvas.width = imageState.originalImage.width * ratio;
    tempCanvas.height = imageState.originalImage.height * ratio;
    tempCtx.drawImage(imageState.originalImage, 0, 0, tempCanvas.width, tempCanvas.height);
    
    const imageSrc = tempCanvas.toDataURL('image/jpeg', 0.6);
    
    // Extract label data from metadata using named properties
    const cameraLine = imageState.metadata.find(m => m.color === 'red');
    const otherLines = imageState.metadata.filter(m => m.color === 'white');
    
    const labelData = {
        camera: cameraLine?.text || 'Unknown Camera',
        lens: otherLines[0]?.text || '',
        settings: otherLines[1]?.text || ''
    };
    
    createBackgroundPhoto(imageSrc, labelData, 200);
}

// =======================================================
// STICKY HEADER SCROLL EFFECT
// =======================================================
function initScrollEffect() {
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        
        if (currentScroll > 50) {
            stickyHeaderWrapper.classList.add('scrolled');
        } else {
            stickyHeaderWrapper.classList.remove('scrolled');
        }
    }, { passive: true });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initStockPhotos();
    initScrollEffect();
});

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
                // Add uploaded photo to dynamic background
                addUploadedPhotoToBackground(imageState);
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
