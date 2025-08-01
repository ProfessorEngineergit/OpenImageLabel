// app.js

// 1. Wähle die notwendigen HTML-Elemente aus
const bildUpload = document.getElementById('bild-upload');
const canvas = document.getElementById('bild-canvas');
const context = canvas.getContext('2d');

// 2. Füge einen Event-Listener hinzu, der auf den Bildupload reagiert
bildUpload.addEventListener('change', handleImageUpload);

/**
 * Diese Funktion wird ausgelöst, wenn der Nutzer eine Datei auswählt.
 * @param {Event} event - Das 'change'-Event des Datei-Input-Feldes.
 */
function handleImageUpload(event) {
    const file = event.target.files[0];

    // Stelle sicher, dass eine Datei ausgewählt wurde
    if (file) {
        const reader = new FileReader();

        // Schritt A: Die FileReader API liest die Datei. Wenn sie fertig ist, wird 'reader.onload' ausgeführt.
        reader.onload = function(e) {
            const image = new Image();

            // Schritt B: Ein Image-Objekt wird erstellt. Wenn das Bild vollständig geladen ist, wird 'image.onload' ausgeführt.
            image.onload = function() {
                // Schritt C: Das Bild ist jetzt geladen und kann verwendet werden.

                // Canvas an die Bildgröße anpassen
                canvas.width = image.width;
                canvas.height = image.height;

                // Das Originalbild auf den Canvas zeichnen
                context.drawImage(image, 0, 0);

                // Metadaten mit der Exif.js Bibliothek auslesen
                // EXIF.getData benötigt das Bild und eine Callback-Funktion als Argumente.
                EXIF.getData(image, function() {
                    const metadatenText = getFormattedMetadata(this);
                    drawMetadataOnCanvas(metadatenText);
                });
            };

            // Dies löst das Laden des Bildes aus (Schritt B)
            image.src = e.target.result;
        };

        // Dies startet das Lesen der Datei (Schritt A)
        reader.readAsDataURL(file);
    }
}

/**
 * Liest die relevanten EXIF-Tags aus dem Bildobjekt und formatiert sie zu einem String.
 * @param {object} image - Das Bildobjekt, an das Exif.js die Metadaten angehängt hat.
 * @returns {string} - Ein formatierter String mit den Metadaten.
 */
function getFormattedMetadata(image) {
    // Hole alle gewünschten Daten mit EXIF.getTag
    const make = EXIF.getTag(image, "Make");
    const model = EXIF.getTag(image, "Model");
    const fNumber = EXIF.getTag(image, "FNumber");
    const exposureTime = EXIF.getTag(image, "ExposureTime");
    const iso = EXIF.getTag(image, "ISOSpeedRatings");
    const dateTime = EXIF.getTag(image, "DateTimeOriginal");

    let metadataParts = [];

    // Füge die Teile nur hinzu, wenn sie auch existieren
    if (make && model) {
        metadataParts.push(`${make} ${model}`);
    } else if (model) {
        metadataParts.push(model);
    }

    let settingsLine = [];
    if (fNumber) {
        // Blende wird als Bruch gespeichert, hier wird sie berechnet
        settingsLine.push(`f/${(fNumber.numerator / fNumber.denominator).toFixed(1)}`);
    }
    if (exposureTime) {
         // Belichtungszeit ist ebenfalls ein Bruch
        settingsLine.push(`${exposureTime.numerator}/${exposureTime.denominator}s`);
    }
    if (iso) {
        settingsLine.push(`ISO ${iso}`);
    }
    
    if (settingsLine.length > 0) {
        metadataParts.push(settingsLine.join(' | '));
    }

    if (dateTime) {
        metadataParts.push(`${dateTime}`);
    }

    // Verbinde alle Teile mit einem Zeilenumbruch
    return metadataParts.join('\n');
}

/**
 * Zeichnet den übergebenen Metadaten-String auf den Canvas.
 * @param {string} metadatenText - Der formatierte String, der auf das Bild gezeichnet werden soll.
 */
function drawMetadataOnCanvas(metadatenText) {
    if (!metadatenText) {
        return; // Nichts zu zeichnen
    }
    
    // Definiere das Aussehen des Textes
    const schriftgroesse = Math.max(24, canvas.width / 50); // Skalierbare Schriftgröße
    context.font = `bold ${schriftgroesse}px 'Helvetica Neue', sans-serif`;
    context.fillStyle = "rgba(255, 255, 255, 0.9)"; // Weiß mit 90% Deckkraft für gute Lesbarkeit
    context.textAlign = "left";
    context.textBaseline = "bottom";

    // Füge einen leichten Schlagschatten für besseren Kontrast hinzu
    context.shadowColor = 'rgba(0, 0, 0, 0.7)';
    context.shadowBlur = 10;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    // Teile den Text in einzelne Zeilen auf
    const lines = metadatenText.split('\n');
    const lineHeight = schriftgroesse * 1.4; // Zeilenhöhe basierend auf Schriftgröße
    const padding = schriftgroesse; // Abstand vom Rand

    // Startposition für den Text (links unten)
    let x = padding;
    let y = canvas.height - padding - ((lines.length - 1) * lineHeight);

    // Zeichne jede Zeile einzeln
    lines.forEach(line => {
        context.fillText(line, x, y);
        y += lineHeight;
    });
}
