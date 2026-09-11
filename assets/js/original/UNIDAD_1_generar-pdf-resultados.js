(function () {
    const JSPDF_URL = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
    let jsPdfPromise;

    function cargarJsPDF() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve();
        }

        if (!jsPdfPromise) {
            jsPdfPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = JSPDF_URL;
                script.onload = resolve;
                script.onerror = () => reject(new Error('No se pudo cargar la libreria de PDF.'));
                document.head.appendChild(script);
            });
        }

        return jsPdfPromise;
    }

    function textoPlano(valor) {
        return String(valor ? '').replace(/\s+/g, ' ').trim();
    }

    function etiquetaOpcion(pregunta, indice) {
        if (typeof indice !== 'number' || !pregunta.options[indice]) {
            return 'Sin responder';
        }

        return `${String.fromCharCode(65 + indice)}) ${textoPlano(pregunta.options[indice])}`;
    }

    window.descargarResultadosPDF = async function descargarResultadosPDF() {
        try {
            if (typeof questions === 'undefined' || !Array.isArray(questions) || questions.length === 0) {
                throw new Error('Aun no se cargan las preguntas de la actividad.');
            }

            await cargarJsPDF();

            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('La libreria de PDF no esta disponible.');
            }

            const { jsPDF } = window.jspdf;
            const respuestas = typeof selectedAnswers !== 'undefined' && selectedAnswers
                ? selectedAnswers
                : {};
            const detalles = questions.map((pregunta, indice) => {
                const respondida = Object.prototype.hasOwnProperty.call(respuestas, indice);
                const respuestaUsuario = respondida ? respuestas[indice] : null;
                const correcta = respuestaUsuario === pregunta.correct;

                return {
                    pregunta,
                    indice,
                    respondida,
                    respuestaUsuario,
                    correcta,
                    estado: !respondida ? 'Sin responder' : correcta ? 'Correcta' : 'Incorrecta'
                };
            });

            const total = detalles.length;
            const correctas = detalles.filter(detalle => detalle.correcta).length;
            const respondidas = detalles.filter(detalle => detalle.respondida).length;
            const incorrectas = respondidas - correctas;
            const sinResponder = total - respondidas;
            const porcentaje = total ? ((correctas / total) * 100).toFixed(1) : '0.0';
            const tiempo = typeof time !== 'undefined' ? `${time}s` : 'No disponible';
            const ataques = typeof attempts !== 'undefined' ? attempts : 0;
            const estadoJuego = textoPlano(document.getElementById('gameStatus')?.innerText) || 'En curso';

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const margen = 16;
            const anchoPagina = pdf.internal.pageSize.getWidth();
            const altoPagina = pdf.internal.pageSize.getHeight();
            const anchoContenido = anchoPagina - (margen * 2);
            const limiteInferior = altoPagina - margen;
            const tituloActividad = document.title || 'Resultados de la actividad';
            let y = 0;

            function encabezado() {
                pdf.setFillColor(30, 64, 175);
                pdf.rect(0, 0, anchoPagina, 22, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(15);
                pdf.text('Resultados de la actividad', margen, 13);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.text(new Date().toLocaleDateString('es-MX'), anchoPagina - margen, 13, { align: 'right' });
                y = 32;
            }

            function nuevaPagina() {
                pdf.addPage();
                encabezado();
            }

            function comprobarEspacio(altura) {
                if (y + altura > limiteInferior) {
                    nuevaPagina();
                }
            }

            function seccion(titulo) {
                comprobarEspacio(12);
                pdf.setTextColor(30, 64, 175);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(13);
                pdf.text(titulo, margen, y);
                y += 3;
                pdf.setDrawColor(191, 219, 254);
                pdf.line(margen, y, anchoPagina - margen, y);
                y += 6;
            }

            function parrafo(texto, tamanio = 10) {
                const lineas = pdf.splitTextToSize(textoPlano(texto), anchoContenido);
                const alturaLinea = tamanio * 0.45;
                pdf.setTextColor(31, 41, 55);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(tamanio);

                lineas.forEach(linea => {
                    comprobarEspacio(alturaLinea);
                    pdf.text(linea, margen, y);
                    y += alturaLinea;
                });

                y += 1.5;
            }

            function lineaResumen(etiqueta, valor) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                const encabezadoLinea = `${etiqueta}: `;
                const anchoEtiqueta = pdf.getTextWidth(encabezadoLinea);
                const lineasValor = pdf.splitTextToSize(String(valor), anchoContenido - anchoEtiqueta);
                const alturaLinea = 4.5;

                lineasValor.forEach((linea, indice) => {
                    comprobarEspacio(alturaLinea);
                    if (indice === 0) {
                        pdf.setTextColor(30, 64, 175);
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(encabezadoLinea, margen, y);
                        pdf.setTextColor(31, 41, 55);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(linea, margen + anchoEtiqueta, y);
                    } else {
                        pdf.setTextColor(31, 41, 55);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(linea, margen + anchoEtiqueta, y);
                    }
                    y += alturaLinea;
                });
            }

            function bloquePregunta(detalle) {
                const respuestaUsuario = etiquetaOpcion(detalle.pregunta, detalle.respuestaUsuario);
                const respuestaCorrecta = etiquetaOpcion(detalle.pregunta, detalle.pregunta.correct);
                const lineasPregunta = pdf.splitTextToSize(textoPlano(detalle.pregunta.question), anchoContenido - 8);
                const lineasUsuario = pdf.splitTextToSize(`Tu respuesta: ${respuestaUsuario}`, anchoContenido - 8);
                const lineasCorrecta = pdf.splitTextToSize(`Respuesta correcta: ${respuestaCorrecta}`, anchoContenido - 8);
                const alturaLinea = 4.1;
                const alturaCaja = 8 + (1 + lineasPregunta.length + lineasUsuario.length + lineasCorrecta.length) * alturaLinea;
                const alturaMaxima = altoPagina - (margen * 2) - 22;

                if (alturaCaja > alturaMaxima) {
                    parrafo(`Desafio ${detalle.indice + 1}: ${detalle.pregunta.question}`, 9);
                    parrafo(`Tu respuesta: ${respuestaUsuario}`, 9);
                    parrafo(`Respuesta correcta: ${respuestaCorrecta}`, 9);
                    parrafo(`Estado: ${detalle.estado}`, 9);
                    return;
                }

                comprobarEspacio(alturaCaja);
                const colorEstado = detalle.correcta ? [22, 163, 74] : detalle.respondida ? [220, 38, 38] : [100, 116, 139];

                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(...colorEstado);
                pdf.roundedRect(margen, y, anchoContenido, alturaCaja, 1.5, 1.5, 'FD');
                y += 5;

                pdf.setTextColor(...colorEstado);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.text(`Desafio ${detalle.indice + 1} - ${detalle.estado}`, margen + 4, y);
                y += alturaLinea;

                pdf.setTextColor(31, 41, 55);
                pdf.setFont('helvetica', 'normal');
                pdf.text(lineasPregunta, margen + 4, y);
                y += lineasPregunta.length * alturaLinea;
                pdf.text(lineasUsuario, margen + 4, y);
                y += lineasUsuario.length * alturaLinea;
                pdf.text(lineasCorrecta, margen + 4, y);
                y += lineasCorrecta.length * alturaLinea + 3;
            }

            encabezado();

            pdf.setTextColor(31, 41, 55);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            parrafo(tituloActividad, 10);

            pdf.setFillColor(239, 246, 255);
            pdf.setDrawColor(147, 197, 253);
            pdf.roundedRect(margen, y, anchoContenido, 28, 2, 2, 'FD');
            pdf.setTextColor(30, 64, 175);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text('Calificacion', anchoPagina / 2, y + 8, { align: 'center' });
            pdf.setFontSize(25);
            pdf.text(`${porcentaje}%`, anchoPagina / 2, y + 18, { align: 'center' });
            pdf.setTextColor(31, 41, 55);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.text(estadoJuego, anchoPagina / 2, y + 24, { align: 'center' });
            y += 38;

            seccion('Resumen');
            lineaResumen('Preguntas', total);
            lineaResumen('Correctas', correctas);
            lineaResumen('Incorrectas', incorrectas);
            lineaResumen('Sin responder', sinResponder);
            lineaResumen('Tiempo', tiempo);
            lineaResumen('Ataques', ataques);
            y += 3;

            seccion('Detalle de respuestas');
            detalles.forEach(bloquePregunta);

            const nombreArchivo = tituloActividad
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/gi, '_')
                .replace(/^_|_$/g, '');
            pdf.save(`Resultados_${nombreArchivo || 'actividad'}.pdf`);
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            alert(`No se pudo generar el PDF: ${error.message || error}`);
        }
    };
})();


