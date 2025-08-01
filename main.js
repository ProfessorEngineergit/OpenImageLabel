'use strict';

// HTML-Elemente holen, mit denen wir arbeiten wollen
const bildUpload = document.getElementById('bild-upload');
const canvas = document.getElementById('bild-canvas');
const context = canvas.getContext('2d');

// Füge einen "change"-Listener zum Dateiupload-Feld hinzu.
// Dieser wird ausgelöst, sobald der Nutzer eine Datei ausgewählt hat.
bildUpload.addEventListener('change', handleImageUpload);

/**
 * Hauptfunktion: Wird ausgeführt, wenn eine Datei ausgewählt wird.
 */
function handleImageUpload(event) {
    const file = event.target.files[0];

    if (file && file.type === "image/jpeg") {
        const reader = new FileReader();

        // Wenn der FileReader die Datei fertig gelesen hat...
        reader.onload = function(e) {
            const image = new Image();

            // Wenn das Bild-Objekt fertig geladen ist...
            image.onload = function() {
                // Canvas an die Bildgröße anpassen
                canvas.width = image.width;
                canvas.height = image.height;

                // Bild auf den Canvas zeichnen
                context.drawImage(image, 0, 0);

                // EXIF-Daten auslesen
                EXIF.getData(image, function() {
                    const metadatenText = getFormattedMetadata(this);

                    if (metadatenText) {
                        drawMetadataOnCanvas(metadatenText);
                    } else {
                        alert("In diesem Bild konnten keine Kamera-Metadaten gefunden werden.");
                    }
                });
            };
            // Lade das Bild aus den gelesenen Dateidaten
            image.src = e.target.result;
        };

        // Starte das Lesen der Datei
        reader.readAsDataURL(file);
    } else if (file) {
        alert("Bitte lade eine JPEG-Datei hoch. Andere Formate enthalten oft keine Kamera-Metadaten.");
    }
}

/**
 * Liest die EXIF-Tags und formatiert sie zu einem sauberen Text.
 */
function getFormattedMetadata(image) {
    const model = EXIF.getTag(image, "Model");
    const fNumber = EXIF.getTag(image, "FNumber");
    const exposureTime = EXIF.getTag(image, "ExposureTime");
    const iso = EXIF.getTag(image, "ISOSpeedRatings");
    
    let metadataParts = [];

    if (model) {
        metadataParts.push(model);
    }
    
    let settingsLine = [];
    if (fNumber) settingsLine.push(`f/${(fNumber.numerator / fNumber.denominator).toFixed(1)}`);
    if (exposureTime) settingsLine.push(`${exposureTime.numerator}/${exposureTime.denominator}s`);
    if (iso) settingsLine.push(`ISO ${iso}`);
    
    if (settingsLine.length > 0) {
        metadataParts.push(settingsLine.join('  |  '));
    }

    return metadataParts.join('\n');
}

/**
 * Zeichnet den formatierten Text auf den Canvas.
 */
function drawMetadataOnCanvas(metadatenText) {
    // Dynamische Schriftgröße basierend auf Bildbreite
    const schriftgroesse = Math.max(20, canvas.width / 45);
    const padding = schriftgroesse * 1.2;
    const lineHeight = schriftgroesse * 1.3;

    // Text-Styling
    context.font = `bold ${schriftgroesse}px 'Helvetica Neue', sans-serif`;
    context.fillStyle = "rgba(255, 255, 255, 0.9)"; // Weiß mit leichter Transparenz
    context.textAlign = "left";
    context.textBaseline = "bottom";

    // Schlagschatten für bessere Lesbarkeit auf jedem Hintergrund
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    const lines = metadatenText.split('\n');
    
    // Positioniere den Text links unten
    let x = padding;
    let y = canvas.height - padding - ((lines.length - 1) * lineHeight);

    // Zeichne jede Zeile
    lines.forEach(line => {
        context.fillText(line.trim(), x, y);
        y += lineHeight;
    });
}
