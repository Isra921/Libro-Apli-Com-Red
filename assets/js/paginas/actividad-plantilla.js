// ==========================================================================
// PLANTILLA DE ACTIVIDAD DE APRENDIZAJE (unidades/unidad-XX/actividades/actividad-X-Y.html)
// Lee <body data-unidad="unidad-XX" data-tema="X.Y" data-preguntas="assets/data/..." data-cantidad="10">.
//
// - Ejercicio: toma al azar "data-cantidad" preguntas del banco JSON y las muestra
//   una a la vez: "Comprobar respuesta" → retroalimentación → siguiente pregunta.
//   Al terminar muestra el resultado (sin valor en la calificación, intentos ilimitados).
// - Desde assets/data/unidades/unidad-XX.json: "Otras actividades", enlace para
//   repasar el tema y navegación inferior.
//
// Tipos de pregunta admitidos (campo "type" del banco):
//   opcion_multiple  · { question, options, answer }  (o { pregunta, opciones, respuesta_correcta })
//   verdadero_falso  · { statement, answer: true | false }
//   completar_oracion· { question con "_____" por espacio, wordBank, answer: [..] }
//   ordenar_oracion  · { question?, segments, answer: [..] }
// Campo opcional en cualquier tipo: "explicacion" (se muestra en la retroalimentación).
// Depende de: data-manager.js, unidades-ui.js
// ==========================================================================

(function () {
    const UI = UnidadesUI;
    const PORCENTAJE_MAXIMO = 100;
    const UMBRAL_APROBADO = 70;
    const UMBRAL_EXCELENTE = 90;
    const INTENTOS_MEZCLA_ORDENAR = 5;
    const PATRON_ESPACIO = /_{3,}/;
    const PATRON_FIN_ORACION = /[.!?]$/;
    const PREFIJO_CLAVE_RESULTADO = 'resultadoActividad:';

    const TIPOS = {
        OPCION_MULTIPLE: 'opcion_multiple',
        VERDADERO_FALSO: 'verdadero_falso',
        COMPLETAR: 'completar_oracion',
        ORDENAR: 'ordenar_oracion'
    };

    const INDICACIONES = {
        [TIPOS.OPCION_MULTIPLE]: 'Selecciona una respuesta',
        [TIPOS.VERDADERO_FALSO]: 'Indica si la afirmación es verdadera o falsa',
        [TIPOS.COMPLETAR]: 'Elige la palabra que corresponde a cada espacio',
        [TIPOS.ORDENAR]: 'Toca los fragmentos en el orden correcto; toca uno ya colocado para quitarlo'
    };

    const MENSAJES = {
        temaNoDisponible: 'Próximamente',
        actividadEnConstruccion: 'Actividad en construcción',
        ordenarPorDefecto: 'Ordena los fragmentos para formar la oración correcta.',
        completarEnunciado: 'Completa la oración.',
        ordenVacio: 'Aquí aparecerá tu oración',
        correcto: 'Tu respuesta es correcta. Continúa con la siguiente pregunta.',
        excelente: '¡Excelente! Dominas los conceptos de este tema.',
        aprobado: '¡Buen trabajo! Repasa las preguntas que fallaste para afianzar el tema.',
        repasar: 'Te recomendamos repasar el tema e intentarlo de nuevo; cada intento es una oportunidad para aprender.'
    };

    const estado = {
        banco: [],
        preguntas: [],
        indice: 0,
        resultados: [],
        respuesta: null,
        comprobada: false,
        repaso: { url: '', texto: 'la unidad' }
    };

    let dom = {};

    // ---------- Utilidades ----------

    function mezclar(lista) {
        const copia = [...lista];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
    }

    const mismaLista = (a, b) => a.length === b.length && a.every((valor, i) => valor === b[i]);

    /** Convierte cada pregunta del banco a un formato común; descarta las que no se pueden usar. */
    function normalizar(p) {
        const tipo = p.type || TIPOS.OPCION_MULTIPLE;
        const explicacion = p.explicacion || p.explanation || '';

        if (tipo === TIPOS.OPCION_MULTIPLE) {
            const opciones = UI.lista(p.options || p.opciones);
            const respuesta = p.answer ?? p.respuesta_correcta;
            if (!opciones.includes(respuesta)) return null;
            return { tipo, enunciado: p.question || p.pregunta, opciones: mezclar(opciones), respuesta, explicacion };
        }
        if (tipo === TIPOS.VERDADERO_FALSO) {
            return { tipo, enunciado: p.statement || p.question, respuesta: p.answer === true || p.answer === 'true', explicacion };
        }
        if (tipo === TIPOS.COMPLETAR) {
            const respuesta = UI.lista(p.answer);
            const partes = String(p.question || '').split(new RegExp(PATRON_ESPACIO, 'g'));
            if (!respuesta.length || partes.length - 1 !== respuesta.length) return null;
            return { tipo, partes, banco: mezclar(UI.lista(p.wordBank)), respuesta, explicacion };
        }
        if (tipo === TIPOS.ORDENAR) {
            const respuesta = UI.lista(p.answer);
            const segmentos = UI.lista(p.segments);
            if (!respuesta.length || segmentos.length !== respuesta.length) return null;
            // Se procura que el orden inicial no sea ya la respuesta.
            let mezclados = mezclar(segmentos);
            for (let i = 0; i < INTENTOS_MEZCLA_ORDENAR && mismaLista(mezclados, respuesta); i++) mezclados = mezclar(segmentos);
            return { tipo, enunciado: p.question || MENSAJES.ordenarPorDefecto, segmentos: mezclados, respuesta, explicacion };
        }
        return null;
    }

    function respuestaVacia(p) {
        if (p.tipo === TIPOS.COMPLETAR) return p.respuesta.map(() => '');
        if (p.tipo === TIPOS.ORDENAR) return [];
        return null;
    }

    function estaCompleta(p, r) {
        if (p.tipo === TIPOS.COMPLETAR) return r.every(valor => valor !== '');
        if (p.tipo === TIPOS.ORDENAR) return r.length === p.segmentos.length;
        return r !== null;
    }

    function esCorrecta(p, r) {
        switch (p.tipo) {
            case TIPOS.OPCION_MULTIPLE: return p.opciones[r] === p.respuesta;
            case TIPOS.VERDADERO_FALSO: return (r === 'true') === p.respuesta;
            case TIPOS.COMPLETAR: return r.every((indice, i) => p.banco[indice] === p.respuesta[i]);
            case TIPOS.ORDENAR: return mismaLista(r.map(indice => p.segmentos[indice]), p.respuesta);
            default: return false;
        }
    }

    /** Texto de la respuesta correcta para la retroalimentación. */
    function respuestaCorrectaTexto(p) {
        switch (p.tipo) {
            case TIPOS.VERDADERO_FALSO: return p.respuesta ? 'Verdadero' : 'Falso';
            case TIPOS.COMPLETAR: return p.partes.map((parte, i) => parte + (p.respuesta[i] ?? '')).join('').trim();
            case TIPOS.ORDENAR: return p.respuesta.join(' ');
            default: return p.respuesta;
        }
    }

    // ---------- Dibujo de cada tipo de pregunta ----------

    function opciones(p) {
        const lista = p.tipo === TIPOS.VERDADERO_FALSO
            ? [{ valor: 'true', texto: 'Verdadero' }, { valor: 'false', texto: 'Falso' }]
            : p.opciones.map((texto, i) => ({ valor: String(i), texto }));
        return `
            <fieldset class="a-options" aria-labelledby="enunciado">
                ${lista.map(o => `
                    <label class="a-option" data-valor="${o.valor}">
                        <input type="radio" name="respuesta" value="${o.valor}">
                        <span>${UI.esc(o.texto)}</span>
                    </label>`).join('')}
            </fieldset>`;
    }

    function completar(p) {
        const selector = i => `
            <select data-espacio="${i}" aria-label="Espacio ${i + 1}">
                <option value="">—</option>
                ${p.banco.map((palabra, j) => `<option value="${j}">${UI.esc(palabra)}</option>`).join('')}
            </select>`;
        const oracion = p.partes.map((parte, i) => UI.esc(parte) + (i < p.respuesta.length ? selector(i) : '')).join('');
        return `<p class="a-fill">${oracion}</p>`;
    }

    function ordenar(p, r) {
        const colocados = r.map((indice, pos) =>
            `<button class="a-segment" type="button" data-colocado="${pos}">${UI.esc(p.segmentos[indice])}</button>`).join('');
        const disponibles = p.segmentos.map((segmento, i) => r.includes(i) ? '' :
            `<button class="a-segment" type="button" data-segmento="${i}">${UI.esc(segmento)}</button>`).join('');
        return `
            <div class="a-order__answer" id="ordenRespuesta" data-vacio="${MENSAJES.ordenVacio}" aria-label="Tu oración">${colocados}</div>
            <div class="a-order__bank" aria-label="Fragmentos disponibles">${disponibles}</div>`;
    }

    function controles(p) {
        if (p.tipo === TIPOS.COMPLETAR) return completar(p);
        if (p.tipo === TIPOS.ORDENAR) return `<div class="a-order" id="orden">${ordenar(p, estado.respuesta)}</div>`;
        return opciones(p);
    }

    function puntos() {
        return estado.preguntas.map((_, i) => {
            const resultado = estado.resultados[i];
            let clase = '';
            let texto = 'pendiente';
            if (resultado !== undefined) {
                clase = resultado ? 'is-correct' : 'is-wrong';
                texto = resultado ? 'correcta' : 'incorrecta';
            } else if (i === estado.indice) {
                clase = 'is-current';
                texto = 'actual';
            }
            return `<li class="${clase}"><span class="u-sr-only">Pregunta ${i + 1}: ${texto}</span></li>`;
        }).join('');
    }

    function botones(principal) {
        return `
            <div class="a-actions">
                <button class="u-btn a-btn--ghost" type="button" data-accion="reiniciar"><i class="fas fa-rotate-left" aria-hidden="true"></i> Reiniciar</button>
                ${principal}
            </div>`;
    }

    // ---------- Flujo del ejercicio ----------

    function dibujarPregunta() {
        const p = estado.preguntas[estado.indice];
        const total = estado.preguntas.length;
        estado.respuesta = respuestaVacia(p);
        estado.comprobada = false;

        dom.contador.textContent = `Pregunta ${estado.indice + 1} de ${total}`;
        dom.retro.innerHTML = '';
        dom.cuerpo.innerHTML = `
            <h3 class="a-question" id="enunciado" tabindex="-1">${UI.esc(p.tipo === TIPOS.COMPLETAR ? MENSAJES.completarEnunciado : p.enunciado)}</h3>
            <p class="a-hint">${INDICACIONES[p.tipo]}</p>
            ${controles(p)}
            <div class="a-exercise__foot">
                <ol class="a-dots" aria-label="Progreso del ejercicio">${puntos()}</ol>
                ${botones('<button class="u-btn u-btn--primary" type="button" data-accion="comprobar" disabled>Comprobar respuesta</button>')}
            </div>`;
    }

    function actualizarBotonComprobar() {
        const boton = dom.cuerpo.querySelector('[data-accion="comprobar"]');
        const p = estado.preguntas[estado.indice];
        if (boton) boton.disabled = !estaCompleta(p, estado.respuesta);
    }

    function comprobar() {
        const p = estado.preguntas[estado.indice];
        if (estado.comprobada || !estaCompleta(p, estado.respuesta)) return;
        estado.comprobada = true;

        const correcta = esCorrecta(p, estado.respuesta);
        estado.resultados[estado.indice] = correcta;
        marcar(p, correcta);

        const ultima = estado.indice === estado.preguntas.length - 1;
        const boton = dom.cuerpo.querySelector('[data-accion="comprobar"]');
        boton.dataset.accion = 'siguiente';
        boton.innerHTML = `${ultima ? 'Ver resultado' : 'Siguiente pregunta'} <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
        dom.cuerpo.querySelector('.a-dots').innerHTML = puntos();

        retroalimentacion(p, correcta);
        boton.focus();
    }

    /** Bloquea la pregunta y señala la respuesta correcta (y la elegida si fue incorrecta). */
    function marcar(p, correcta) {
        if (p.tipo === TIPOS.COMPLETAR) {
            dom.cuerpo.querySelectorAll('select[data-espacio]').forEach(select => {
                const i = Number(select.dataset.espacio);
                select.classList.add(p.banco[select.value] === p.respuesta[i] ? 'is-correct' : 'is-wrong');
                select.disabled = true;
            });
            return;
        }
        if (p.tipo === TIPOS.ORDENAR) {
            document.getElementById('ordenRespuesta').classList.add(correcta ? 'is-correct' : 'is-wrong');
            dom.cuerpo.querySelectorAll('.a-segment').forEach(segmento => { segmento.disabled = true; });
            return;
        }
        const valorCorrecto = p.tipo === TIPOS.VERDADERO_FALSO
            ? String(p.respuesta)
            : String(p.opciones.indexOf(p.respuesta));
        dom.cuerpo.querySelectorAll('.a-option').forEach(opcion => {
            const input = opcion.querySelector('input');
            input.disabled = true;
            opcion.classList.add('is-locked');
            let marca = '';
            if (opcion.dataset.valor === valorCorrecto) {
                opcion.classList.add('is-correct');
                marca = '<i class="fas fa-check a-option__mark" aria-hidden="true"></i><span class="u-sr-only">(respuesta correcta)</span>';
            } else if (input.checked) {
                opcion.classList.add('is-wrong');
                marca = '<i class="fas fa-xmark a-option__mark" aria-hidden="true"></i><span class="u-sr-only">(tu respuesta)</span>';
            }
            opcion.insertAdjacentHTML('beforeend', marca);
        });
    }

    function retroalimentacion(p, correcta) {
        const explicacion = p.explicacion ? `${UI.esc(p.explicacion)} ` : '';
        const repaso = estado.repaso.url
            ? `<a href="${UI.esc(estado.repaso.url)}">${UI.esc(estado.repaso.texto)}</a>`
            : UI.esc(estado.repaso.texto);
        const solucion = String(respuestaCorrectaTexto(p));
        const cierre = PATRON_FIN_ORACION.test(solucion) ? '' : '.';
        const texto = correcta
            ? (explicacion || MENSAJES.correcto)
            : `${explicacion}La respuesta correcta es: <strong>${UI.esc(solucion)}</strong>${cierre} Repasa el concepto en ${repaso}.`;

        dom.retro.innerHTML = `
            <section class="a-card a-feedback${correcta ? '' : ' is-wrong'}" aria-labelledby="retroTitulo">
                <span class="a-feedback__icon"><i class="fas ${correcta ? 'fa-check' : 'fa-xmark'}" aria-hidden="true"></i></span>
                <div>
                    <p class="a-feedback__title" id="retroTitulo">Retroalimentación · ${correcta ? '¡Correcto!' : 'Respuesta incorrecta'}</p>
                    <p class="a-feedback__text">${texto}</p>
                </div>
            </section>`;
    }

    function siguiente() {
        if (estado.indice < estado.preguntas.length - 1) {
            estado.indice++;
            dibujarPregunta();
            document.getElementById('enunciado').focus();
        } else {
            dibujarResultado();
        }
    }

    function dibujarResultado() {
        const total = estado.preguntas.length;
        const aciertos = estado.resultados.filter(Boolean).length;
        const porcentaje = Math.round((aciertos / total) * PORCENTAJE_MAXIMO);
        const mensaje = porcentaje >= UMBRAL_EXCELENTE ? MENSAJES.excelente
            : porcentaje >= UMBRAL_APROBADO ? MENSAJES.aprobado : MENSAJES.repasar;

        UI.guardarPreferencia(PREFIJO_CLAVE_RESULTADO + document.body.dataset.tema, porcentaje);
        mostrarUltimoResultado();

        const repaso = estado.repaso.url
            ? `<a class="u-btn a-btn--ghost" href="${UI.esc(estado.repaso.url)}"><i class="fas fa-book-open" aria-hidden="true"></i> Repasar ${UI.esc(estado.repaso.texto)}</a>`
            : '';

        dom.contador.textContent = 'Resultado';
        dom.retro.innerHTML = '';
        dom.cuerpo.innerHTML = `
            <div class="a-result${porcentaje < UMBRAL_APROBADO ? ' is-low' : ''}" id="resultado" tabindex="-1">
                <span class="a-result__icon"><i class="fas ${porcentaje >= UMBRAL_APROBADO ? 'fa-trophy' : 'fa-book-open-reader'}" aria-hidden="true"></i></span>
                <p class="a-result__score">${porcentaje} %</p>
                <p class="a-result__detail">${UI.plural(aciertos, 'respuesta correcta', 'respuestas correctas')} de ${total}</p>
                <p class="a-result__text">${mensaje}</p>
                <div class="a-actions">
                    ${repaso}
                    <button class="u-btn u-btn--primary" type="button" data-accion="reiniciar">Intentar de nuevo <i class="fas fa-rotate-right" aria-hidden="true"></i></button>
                </div>
            </div>`;
        document.getElementById('resultado').focus();
    }

    function mostrarUltimoResultado() {
        const chip = document.getElementById('ultimoResultado');
        const valor = UI.leerPreferencia(PREFIJO_CLAVE_RESULTADO + document.body.dataset.tema, null);
        if (!chip || valor === null) return;
        chip.querySelector('strong').textContent = `${valor} %`;
        chip.hidden = false;
    }

    /** Nuevo intento: otra selección al azar de preguntas. */
    function iniciarIntento() {
        const cantidad = Number(document.body.dataset.cantidad) || estado.banco.length;
        estado.preguntas = mezclar(estado.banco).map(normalizar).filter(Boolean).slice(0, cantidad);
        estado.indice = 0;
        estado.resultados = [];
        if (!estado.preguntas.length) throw new Error('El banco de preguntas no tiene preguntas válidas.');
        const chip = document.getElementById('totalPreguntas');
        if (chip) chip.textContent = estado.preguntas.length;
        dibujarPregunta();
    }

    function iniciarEventos() {
        dom.cuerpo.addEventListener('change', e => {
            if (estado.comprobada) return;
            if (e.target.name === 'respuesta') estado.respuesta = e.target.value;
            if (e.target.dataset.espacio !== undefined) estado.respuesta[Number(e.target.dataset.espacio)] = e.target.value;
            actualizarBotonComprobar();
        });

        dom.cuerpo.addEventListener('click', e => {
            const control = e.target.closest('button');
            if (!control) return;
            const { accion, segmento, colocado } = control.dataset;

            if (accion === 'comprobar') comprobar();
            else if (accion === 'siguiente') siguiente();
            else if (accion === 'reiniciar') { iniciarIntento(); document.getElementById('enunciado').focus(); }
            else if (!estado.comprobada && (segmento !== undefined || colocado !== undefined)) {
                if (segmento !== undefined) estado.respuesta.push(Number(segmento));
                else estado.respuesta.splice(Number(colocado), 1);
                document.getElementById('orden').innerHTML = ordenar(estado.preguntas[estado.indice], estado.respuesta);
                actualizarBotonComprobar();
            }
        });
    }

    // ---------- Datos de la unidad: barra lateral y navegación ----------

    function itemLateral({ url, contenido, clase = '', actual = false, motivo }) {
        const claseActual = actual ? ' is-current' : '';
        if (actual) return `<span class="a-side-item ${clase}${claseActual}" aria-current="page">${contenido}</span>`;
        if (url) return `<a class="a-side-item ${clase}" href="${UI.esc(DataManager.ruta(url))}">${contenido}</a>`;
        return `
            <span class="a-side-item ${clase} is-pending" aria-disabled="true" title="${UI.esc(motivo)}">
                ${contenido}
                <i class="fas fa-lock a-side-item__lock" aria-hidden="true"></i>
                <span class="u-sr-only">(${UI.esc(motivo)})</span>
            </span>`;
    }

    function otrasActividades(unidad, numeroTema) {
        const actividades = UI.actividades(unidad).map(a => `<li>${itemLateral({
            url: a.disponible ? a.url : '',
            actual: a.numero === numeroTema,
            contenido: `<i class="fas fa-pen-to-square" aria-hidden="true"></i><span>Actividad ${UI.esc(a.numero)}</span>`,
            motivo: a.temaDisponible ? MENSAJES.actividadEnConstruccion : MENSAJES.temaNoDisponible
        })}</li>`);

        const final = unidad.actividad_final ? `
            <ul class="a-side-list">
                <li>${itemLateral({
                    url: unidad.actividad_final.url,
                    clase: 'a-side-item--final',
                    contenido: '<i class="fas fa-flag-checkered" aria-hidden="true"></i><span>Actividad final</span>',
                    motivo: MENSAJES.actividadEnConstruccion
                })}</li>
            </ul>` : '';

        return `<ul class="a-side-list">${actividades.join('')}</ul>${final}`;
    }

    /** Izquierda: volver al tema. Derecha: siguiente tema disponible o actividad final. */
    function navegacion(unidad, tema) {
        const temas = UI.lista(unidad.temas);
        const posicion = temas.findIndex(t => t.numero === tema.numero);
        const siguiente = temas.slice(posicion + 1).find(t => t.url);
        const destino = siguiente ? siguiente.url : (unidad.actividad_final && unidad.actividad_final.url);

        const volver = tema.url
            ? `<a class="a-pager__prev" href="${UI.esc(DataManager.ruta(tema.url))}"><i class="fas fa-arrow-left" aria-hidden="true"></i> Volver al tema ${UI.esc(tema.numero)}</a>`
            : `<a class="a-pager__prev" href="${UI.esc(DataManager.urlUnidad(unidad.id))}"><i class="fas fa-arrow-left" aria-hidden="true"></i> Volver a la unidad</a>`;
        const avanzar = destino
            ? `<a class="u-btn u-btn--primary" href="${UI.esc(DataManager.ruta(destino))}">Siguiente contenido <i class="fas fa-arrow-right" aria-hidden="true"></i></a>`
            : '';
        return `${volver}${avanzar}`;
    }

    async function cargarUnidad() {
        const { unidad: idUnidad, tema: numeroTema } = document.body.dataset;
        try {
            const unidad = await DataManager.getUnidad(idUnidad);
            const tema = UI.lista(unidad.temas).find(t => t.numero === numeroTema);
            if (!tema) throw new Error(`El tema ${numeroTema} no aparece en la lista "temas" de ${idUnidad}.json.`);

            document.title = `${(tema.actividad && tema.actividad.nombre) || `Actividad ${numeroTema}`} | Unidad ${UI.romano(unidad.numero)} | Aplicaciones para Comunicaciones en Red`;

            if (tema.url) {
                estado.repaso = { url: DataManager.ruta(tema.url), texto: `el tema ${tema.numero}` };
                const enlace = document.getElementById('enlaceRepaso');
                if (enlace) {
                    enlace.href = estado.repaso.url;
                    enlace.querySelector('span').textContent = `Repasar el tema ${tema.numero}`;
                }
            }

            const lista = document.getElementById('otrasActividades');
            if (lista) lista.innerHTML = otrasActividades(unidad, numeroTema);
            const pager = document.getElementById('actividadNavegacion');
            if (pager) pager.innerHTML = navegacion(unidad, tema);
        } catch (error) {
            // Se conservan los enlaces de respaldo escritos en el HTML.
            console.error(error);
        }
    }

    // ---------- Arranque ----------

    document.addEventListener('DOMContentLoaded', async () => {
        dom = {
            cuerpo: document.getElementById('ejercicio'),
            contador: document.getElementById('ejercicioContador'),
            retro: document.getElementById('retroalimentacion')
        };
        estado.repaso = { url: DataManager.urlUnidad(document.body.dataset.unidad), texto: 'la unidad' };
        mostrarUltimoResultado();

        const unidadLista = cargarUnidad();
        try {
            const banco = await DataManager.getArchivo(document.body.dataset.preguntas);
            estado.banco = UI.lista(banco);
            await unidadLista;
            iniciarEventos();
            iniciarIntento();
            dom.cuerpo.setAttribute('aria-busy', 'false');
        } catch (error) {
            UI.mostrarError(dom.cuerpo, error);
        }
    });
})();
