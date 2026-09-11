
function generarPDFFinal() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('No se carg la librera para generar el PDF.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margen = 16;
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const anchoContenido = anchoPagina - (margen * 2);
    const limiteInferior = altoPagina - margen;
    let y = 0;

    const texto = (id) =>
        document.getElementById(id)?.innerText.trim() || 'Sin informacin';

    function encabezado() {
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, anchoPagina, 22, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Resultados de la actividad', margen, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(
            new Date().toLocaleDateString('es-MX'),
            anchoPagina - margen,
            13,
            { align: 'right' }
        );

        y = 32;
    }

    function nuevaPagina() {
        doc.addPage();
        encabezado();
    }

    function comprobarEspacio(altura) {
        if (y + altura > limiteInferior) {
            nuevaPagina();
        }
    }

    function titulo(titulo) {
        comprobarEspacio(12);

        doc.setTextColor(30, 64, 175);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(titulo, margen, y);

        y += 3;
        doc.setDrawColor(191, 219, 254);
        doc.line(margen, y, anchoPagina - margen, y);
        y += 6;
    }

    function agregarTexto(contenido, tamanio = 10) {
        const parrafos = String(contenido)
            .split(/\n+/)
            .map(linea => linea.trim())
            .filter(Boolean);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(tamanio);

        const alturaLinea = tamanio * 0.45;

        parrafos.forEach(parrafo => {
            const lineas = doc.splitTextToSize(parrafo, anchoContenido);

            lineas.forEach(linea => {
                comprobarEspacio(alturaLinea);
                doc.text(linea, margen, y);
                y += alturaLinea;
            });

            y += 1.5;
        });
    }

    function agregarPregunta(contenido) {
        const limpio = String(contenido).replace(/\s+/g, ' ').trim();
        const lineas = doc.splitTextToSize(limpio, anchoContenido - 8);
        const alturaLinea = 4.2;
        const alturaCaja = Math.max(12, (lineas.length * alturaLinea) + 8);
        const espacioDisponible = altoPagina - (margen * 2) - 22;

        // Una respuesta extremadamente larga puede repartirse sin dejar pginas vacas.
        if (alturaCaja > espacioDisponible) {
            agregarTexto(limpio, 9);
            return;
        }

        comprobarEspacio(alturaCaja);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(37, 99, 235);
        doc.roundedRect(margen, y, anchoContenido, alturaCaja, 1.5, 1.5, 'FD');

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(lineas, margen + 4, y + 5);

        y += alturaCaja + 3;
    }

    encabezado();

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(margen, y, anchoContenido, 30, 2, 2, 'FD');

    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Calificacin obtenida', anchoPagina / 2, y + 8, { align: 'center' });

    doc.setFontSize(26);
    doc.text(texto('gradeValue'), anchoPagina / 2, y + 18, { align: 'center' });

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const mensaje = doc.splitTextToSize(texto('resultsMessage'), anchoContenido - 12);
    doc.text(mensaje, anchoPagina / 2, y + 25, { align: 'center' });

    y += 40;

    titulo('Resumen');
    agregarTexto(texto('resultsSummary'));

    titulo('Desempeo por categora');
    agregarTexto(texto('categoryPerformance'));

    titulo('Revisin de respuestas');

    const preguntas = document.querySelectorAll('#questionReview > *');

    if (preguntas.length === 0) {
        agregarTexto('No hay respuestas para mostrar.');
    } else {
        preguntas.forEach(pregunta => {
            agregarPregunta(pregunta.innerText);
        });
    }

    doc.save('Resultados_Caso_Final.pdf');
}



