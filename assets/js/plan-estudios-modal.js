// ==========================================================================
// VENTANA EMERGENTE · PLAN DE ESTUDIOS
// --------------------------------------------------------------------------
// - Los datos viven en assets/data/plan-estudios.json.
// - Solo construye el contenido; la ventana base, botón de cerrar y
//   accesibilidad las gestiona ventana-modal.js.
// - Se abre con cualquier elemento [data-modal="plan-estudios"].
// ==========================================================================
(function () {
    const ID_VENTANA = 'plan-estudios';
    const RUTA_DATOS = 'assets/data/plan-estudios.json';
    const { el, icono } = VentanaModal;

    function renderizarContenido(datos) {
        const contenedor = el('div', 'pe-container');

        // 1. Barra de descarga de PDF
        const headerAction = el('div', 'pe-header-action');
        const headerTitle = el('div', 'pe-header-title');
        headerTitle.append(icono('fa-file-pdf'), el('span', '', `${datos.datos_generales.unidad_aprendizaje} · Plan Oficial ${datos.datos_generales.plan_estudios}`));

        const btnDownload = el('a', 'pe-btn-download');
        btnDownload.href = DataManager.ruta(datos.archivo_pdf);
        btnDownload.target = '_blank';
        btnDownload.download = 'Plan_de_marketing_Plan_Estudios.pdf';
        btnDownload.append(icono('fa-download'), el('span', '', 'Descargar PDF oficial'));

        headerAction.append(headerTitle, btnDownload);
        contenedor.append(headerAction);

        // 2. Cuadrícula de datos generales
        const gridInfo = el('div', 'pe-grid-info');
        const campos = [
            { label: 'Unidad Académica', valor: datos.datos_generales.unidad_academica },
            { label: 'Programa Académico', valor: datos.datos_generales.programa_academico },
            { label: 'Semestre / Modalidad', valor: `${datos.datos_generales.semestre} · ${datos.datos_generales.modalidad}` },
            { label: 'Tipo de Unidad', valor: datos.datos_generales.tipo },
            { label: 'Créditos', valor: `Tepic: ${datos.datos_generales.creditos_tepic} / SATCA: ${datos.datos_generales.creditos_satca}` },
            { label: 'Horas Totales', valor: `${datos.datos_generales.horas_totales} (${datos.datos_generales.horas_teoria_semana} teoría / ${datos.datos_generales.horas_practica_semana} práctica)` }
        ];

        campos.forEach(c => {
            const card = el('div', 'pe-info-card');
            card.append(el('span', 'pe-info-card__label', c.label));
            card.append(el('span', 'pe-info-card__value', c.valor));
            gridInfo.append(card);
        });
        contenedor.append(gridInfo);

        // 3. Propósito de la Unidad
        const cardProposito = el('div', 'pe-section-card');
        const h4Proposito = el('h4', '');
        h4Proposito.append(icono('fa-bullseye'), el('span', '', ' Propósito de la Unidad de Aprendizaje'));
        cardProposito.append(h4Proposito, el('p', '', datos.proposito));
        contenedor.append(cardProposito);

        // 4. Intención Educativa
        const cardIntencion = el('div', 'pe-section-card');
        const h4Intencion = el('h4', '');
        h4Intencion.append(icono('fa-graduation-cap'), el('span', '', ' Intención Educativa'));
        cardIntencion.append(h4Intencion, el('p', '', datos.intencion_educativa));
        contenedor.append(cardIntencion);

        // 5. Unidades Temáticas (Contenidos del Programa)
        const secUnidades = el('div', 'pe-section-card');
        const h4Unidades = el('h4', '');
        h4Unidades.append(icono('fa-layer-group'), el('span', '', ' Contenidos y Unidades Temáticas'));
        secUnidades.append(h4Unidades);

        const listUnidades = el('div', 'pe-units-list');
        datos.unidades_tematicas.forEach(u => {
            const uCard = el('div', 'pe-unit-card');
            const uHead = el('div', 'pe-unit-card__head');
            uHead.append(
                el('h5', 'pe-unit-card__title', `Unidad ${u.numero}: ${u.titulo}`),
                el('span', 'pe-unit-card__hours', u.horas_docente)
            );

            const uComp = el('p', 'pe-unit-card__comp');
            uComp.append(el('strong', '', 'Competencia: '), document.createTextNode(u.competencia));

            const ulTemas = el('ul', 'pe-unit-card__topics');
            u.temas.forEach(t => {
                const li = el('li', '', t);
                ulTemas.append(li);
            });

            uCard.append(uHead, uComp, ulTemas);
            listUnidades.append(uCard);
        });
        secUnidades.append(listUnidades);
        contenedor.append(secUnidades);

        // 6. Evaluación y Acreditación
        const cardEval = el('div', 'pe-section-card');
        const h4Eval = el('h4', '');
        h4Eval.append(icono('fa-check-double'), el('span', '', ' Evaluación y Acreditación'));
        const ulEval = el('ul', 'pe-eval-list');
        datos.evaluacion.forEach(ev => {
            ulEval.append(el('li', '', ev));
        });
        cardEval.append(h4Eval, ulEval);
        contenedor.append(cardEval);

        return contenedor;
    }

    VentanaModal.registrar(ID_VENTANA, async () => {
        const datos = await DataManager.getArchivo(RUTA_DATOS);
        return {
            titulo: `${datos.titulo} · ${datos.datos_generales.unidad_aprendizaje}`,
            botonCerrar: datos.boton_cerrar,
            secciones: [
                {
                    id: 'programa-sintetico',
                    pestana: 'Programa Oficial',
                    contenido: renderizarContenido(datos)
                }
            ]
        };
    });
})();
