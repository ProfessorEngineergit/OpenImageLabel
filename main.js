'use strict';

// UI-Elemente auswählen
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('bild-upload');
const canvas = document.getElementById('bild-canvas');
const context = canvas.getContext('2d');
const promptElement = document.querySelector('.drop-zone-prompt');
const loader = document.getElementById('loader');
const downloadButton = document.getElementById('download-button');
let originalFileName = 'image-with-metadata.jpg';

// --- EVENT LISTENERS ---

// Klick auf die Drop-Zone öffnet den Dateidialog
dropZone.addEventListener('click', () => fileInput.click());

// Reaktion auf Dateiauswahl über den Dialog
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImageFile(file);
    }
});

// Drag & Drop Event-Handler
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault(); // Verhindert, dass der Browser die Datei öffnet
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
        processImageFile(file);
    }
});

// Download-Button-Funktionalität
downloadButton.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/jpeg', 0.9); // JPEG mit 90% Qualität
    downloadButton.href = dataURL;
    downloadButton.download = originalFileName;
});


// --- HAUPTFUNKTIONEN ---

/**
 * Verarbeitet die hochgeladene Bilddatei
 * @param {File} file - Die Bilddatei
 */
function processImageFile(file) {
    if (!file.type.startsWith('image/jpeg')) {
        alert("Bitte nur JPEG-Dateien hochladen.");
        return;
    }
    
    originalFileName = file.name.replace(/\.jpeg$|\.jpg$/i, '-with-metadata.jpg');
    
    // UI für die Verarbeitung vorbereiten
    promptElement.style.display = 'none';
    loader.style.display = 'block';
    canvas.style.display = 'none';
    downloadButton.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0);

            EXIF.getData(image, function() {
                const metadataLines = getFormattedMetadata(this);
                drawMetadataOnCanvas(metadataLines);
                
                // UI nach Verarbeitung aktualisieren
                loader.style.display = 'none';
                canvas.style.display = 'block';
                downloadButton.style.display = 'inline-block';
            });
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Liest viele EXIF-Tags und gibt sie als Array von Objekten zurück.
 * Jedes Objekt enthält den Text und die gewünschte Farbe.
 */
function getFormattedMetadata(image) {
    const lines = [];

    // Kameramodell und Objektiv
    const model = EXIF.getTag(image, "Model");
    const lensModel = EXIF.getTag(image, "LensModel");
    if (model) {
        // Diese Zeile wird rot gezeichnet
        lines.push({ text: model, color: '#ff4136' }); // Leuchtendes Rot
    }
    if (lensModel) {
        lines.push({ text: lensModel, color: '#ffffff' });
    }

    // Aufnahmeeinstellungen
    const fNumber = EXIF.getTag(image, "FNumber");
    const exposureTime = EXIF.getTag(image, "ExposureTime");
    const iso = EXIF.getTag(image, "ISOSpeedRatings");
    const focalLength = EXIF.getTag(image, "FocalLength");

    const settings = [];
    if (focalLength) settings.push(`${focalLength.numerator / focalLength.denominator}mm`);
    if (fNumber) settings.push(`f/${(fNumber.numerator / fNumber.denominator).toFixed(1)}`);
    if (exposureTime) settings.push(`${exposureTime.numerator}/${exposureTime.denominator}s`);
    if (iso) settings.push(`ISO ${iso}`);
    
    if (settings.length > 0) {
        lines.push({ text: settings.join('  |  '), color: '#ffffff' });
    }

    return lines;
}

/**
 * Zeichnet die Metadaten-Zeilen (mit individuellen Farben) auf den Canvas.
 */
function drawMetadataOnCanvas(metadataLines) {
    const schriftgroesse = Math.max(20, canvas.width / 45);
    const padding = schriftgroesse * 1.5;
    const lineHeight = schriftgroesse * 1.4;

    context.font = `700 ${schriftgroesse}px 'Inter', sans-serif`; // 700 = bold
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = schriftgroesse / 2;
    
    // Startposition links unten
    let x = padding;
    let y = canvas.height - padding;

    // Zeichne die Zeilen von unten nach oben
    metadataLines.reverse().forEach(line => {
        context.fillStyle = line.color; // Setze die Farbe für jede Zeile individuell
        context.fillText(line.text, x, y);
        y -= lineHeight;
    });
}
