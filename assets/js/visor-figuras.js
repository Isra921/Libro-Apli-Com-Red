// ==========================================================================
// VISOR DE FIGURAS (unidades/unidad-XX/temas/tema-XX-YY.html)
// Las figuras marcadas con <figure class="t-figure" data-ampliable> se abren
// en un <dialog> con zoom (botones, rueda, doble clic, pellizco y teclado),
// arrastre para recorrer la imagen y un panel de información adicional.
// La información adicional se escribe en el HTML de la figura:
//   <template class="t-figure__info"> ...contenido... </template>
// El título del panel se toma del <figcaption> ("<strong>Figura N.</strong> Texto").
// ==========================================================================

(function () {
    const ESCALA_MINIMA = 1;
    const ESCALA_MAXIMA = 2;
    const PASO_BOTON = 1.5;
    const PASO_RUEDA = 1.15;
    const ESCALA_DOBLE_CLIC = ESCALA_MAXIMA;
    const PASO_TECLADO_PX = 80;
    const PORCENTAJE = 100;

    const estado = { escala: ESCALA_MINIMA, x: 0, y: 0 };
    const punteros = new Map();
    let visor = null;
    let origen = null;

    // ---------- Diálogo ----------

    function crearVisor() {
        document.body.insertAdjacentHTML('beforeend', `
            <dialog class="t-viewer" id="visorFigura" aria-labelledby="visorTitulo">
                <div class="t-viewer__stage">
                    <div class="t-viewer__viewport" tabindex="0"
                         aria-label="Imagen ampliada. Usa + y - para acercar o alejar, 0 para ajustar y las flechas para desplazarte.">
                        <img class="t-viewer__img" alt="" draggable="false">
                    </div>
                    <div class="t-viewer__tools" role="toolbar" aria-label="Controles de zoom">
                        <button type="button" data-accion="alejar" aria-label="Alejar"><i class="fas fa-magnifying-glass-minus" aria-hidden="true"></i></button>
                        <output class="t-viewer__level" aria-live="polite">100 %</output>
                        <button type="button" data-accion="acercar" aria-label="Acercar"><i class="fas fa-magnifying-glass-plus" aria-hidden="true"></i></button>
                        <button type="button" data-accion="ajustar" aria-label="Ajustar a la pantalla"><i class="fas fa-expand" aria-hidden="true"></i></button>
                    </div>
                </div>
                <aside class="t-viewer__panel">
                    <p class="t-viewer__eyebrow"></p>
                    <h2 class="t-viewer__title" id="visorTitulo"></h2>
                    <div class="t-viewer__info"></div>
                </aside>
                <button class="t-viewer__close" type="button" aria-label="Cerrar">
                    <i class="fas fa-xmark" aria-hidden="true"></i>
                </button>
            </dialog>`);

        const dialogo = document.getElementById('visorFigura');
        visor = {
            dialogo,
            viewport: dialogo.querySelector('.t-viewer__viewport'),
            img: dialogo.querySelector('.t-viewer__img'),
            nivel: dialogo.querySelector('.t-viewer__level'),
            alejar: dialogo.querySelector('[data-accion="alejar"]'),
            acercar: dialogo.querySelector('[data-accion="acercar"]'),
            ajustar: dialogo.querySelector('[data-accion="ajustar"]'),
            eyebrow: dialogo.querySelector('.t-viewer__eyebrow'),
            titulo: dialogo.querySelector('.t-viewer__title'),
            info: dialogo.querySelector('.t-viewer__info')
        };

        visor.alejar.addEventListener('click', () => zoom(estado.escala / PASO_BOTON));
        visor.acercar.addEventListener('click', () => zoom(estado.escala * PASO_BOTON));
        visor.ajustar.addEventListener('click', restablecer);
        dialogo.querySelector('.t-viewer__close').addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); });
        dialogo.addEventListener('close', () => {
            punteros.clear();
            if (origen) origen.focus();
        });
        dialogo.addEventListener('keydown', teclado);
        iniciarGestos();
        window.addEventListener('resize', () => { if (dialogo.open) { limitar(); aplicar(); } });
    }

    function abrir(figura, boton) {
        if (!visor) crearVisor();
        const imagen = figura.querySelector('.t-figure__media img');
        const { etiqueta, texto } = leerPie(figura);
        const plantilla = figura.querySelector('template.t-figure__info');

        visor.img.src = imagen.currentSrc || imagen.src;
        visor.img.alt = imagen.alt;
        visor.eyebrow.textContent = etiqueta;
        visor.titulo.textContent = texto;
        visor.info.replaceChildren(plantilla ? plantilla.content.cloneNode(true) : '');
        visor.info.scrollTop = 0;

        origen = boton;
        estado.escala = ESCALA_MINIMA;
        estado.x = 0;
        estado.y = 0;
        aplicar();
        visor.dialogo.showModal();
        visor.viewport.focus();
    }

    /** "<strong>Figura 3.</strong> La OMT…" -> { etiqueta: "Figura 3", texto: "La OMT…" } */
    function leerPie(figura) {
        const pie = figura.querySelector('figcaption');
        if (!pie) return { etiqueta: '', texto: '' };
        const fuerte = pie.querySelector('strong');
        const etiqueta = fuerte ? fuerte.textContent.trim().replace(/\.$/, '') : '';
        const texto = pie.textContent.replace(fuerte ? fuerte.textContent : '', '').trim().replace(/\.$/, '');
        return { etiqueta, texto };
    }

    // ---------- Zoom y desplazamiento ----------

    function aplicar() {
        const { escala, x, y } = estado;
        visor.img.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
        visor.nivel.value = `${Math.round(escala * PORCENTAJE)} %`;
        visor.viewport.classList.toggle('is-zoomed', escala > ESCALA_MINIMA);
        visor.alejar.disabled = escala <= ESCALA_MINIMA;
        visor.ajustar.disabled = escala <= ESCALA_MINIMA;
        visor.acercar.disabled = escala >= ESCALA_MAXIMA;
    }

    /** Evita que la imagen se aleje del borde y deje huecos vacíos. */
    function limitar() {
        const { img, viewport } = visor;
        const maxX = Math.max(0, (img.offsetWidth * estado.escala - viewport.clientWidth) / 2);
        const maxY = Math.max(0, (img.offsetHeight * estado.escala - viewport.clientHeight) / 2);
        estado.x = Math.min(maxX, Math.max(-maxX, estado.x));
        estado.y = Math.min(maxY, Math.max(-maxY, estado.y));
    }

    /** Cambia la escala manteniendo fijo el punto (px, py), medido desde el centro del visor. */
    function zoom(escalaNueva, px = 0, py = 0) {
        const escala = Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, escalaNueva));
        const factor = escala / estado.escala;
        estado.x = px - (px - estado.x) * factor;
        estado.y = py - (py - estado.y) * factor;
        estado.escala = escala;
        limitar();
        aplicar();
    }

    function restablecer() {
        estado.x = 0;
        estado.y = 0;
        zoom(ESCALA_MINIMA);
    }

    function desdeCentro(clientX, clientY) {
        const r = visor.viewport.getBoundingClientRect();
        return [clientX - r.left - r.width / 2, clientY - r.top - r.height / 2];
    }

    /** Centro y separación de los dedos/cursor activos (la separación sirve para el pellizco). */
    function medir() {
        const [a, b] = Array.from(punteros.values());
        if (!b) return { x: a.x, y: a.y, distancia: 0 };
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distancia: Math.hypot(a.x - b.x, a.y - b.y) };
    }

    function iniciarGestos() {
        const { viewport } = visor;

        viewport.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? PASO_RUEDA : 1 / PASO_RUEDA;
            zoom(estado.escala * factor, ...desdeCentro(e.clientX, e.clientY));
        }, { passive: false });

        viewport.addEventListener('dblclick', e => {
            if (estado.escala > ESCALA_MINIMA) restablecer();
            else zoom(ESCALA_DOBLE_CLIC, ...desdeCentro(e.clientX, e.clientY));
        });

        viewport.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            viewport.setPointerCapture(e.pointerId);
            punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
            viewport.classList.add('is-dragging');
        });

        viewport.addEventListener('pointermove', e => {
            if (!punteros.has(e.pointerId)) return;
            const antes = medir();
            punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const ahora = medir();

            estado.x += ahora.x - antes.x;
            estado.y += ahora.y - antes.y;
            if (antes.distancia && ahora.distancia) {
                zoom(estado.escala * ahora.distancia / antes.distancia, ...desdeCentro(ahora.x, ahora.y));
            } else {
                limitar();
                aplicar();
            }
        });

        const soltar = e => {
            punteros.delete(e.pointerId);
            if (!punteros.size) viewport.classList.remove('is-dragging');
        };
        viewport.addEventListener('pointerup', soltar);
        viewport.addEventListener('pointercancel', soltar);
    }

    function teclado(e) {
        const desplazamientos = {
            ArrowLeft: [PASO_TECLADO_PX, 0],
            ArrowRight: [-PASO_TECLADO_PX, 0],
            ArrowUp: [0, PASO_TECLADO_PX],
            ArrowDown: [0, -PASO_TECLADO_PX]
        };

        if (e.key === '+' || e.key === '=') zoom(estado.escala * PASO_BOTON);
        else if (e.key === '-') zoom(estado.escala / PASO_BOTON);
        else if (e.key === '0') restablecer();
        else if (desplazamientos[e.key] && e.target === visor.viewport) {
            const [dx, dy] = desplazamientos[e.key];
            estado.x += dx;
            estado.y += dy;
            limitar();
            aplicar();
        } else return;
        e.preventDefault();
    }

    // ---------- Figuras del tema ----------

    /** Envuelve la imagen en un botón para que se pueda abrir con clic, Enter o Espacio. */
    function prepararFigura(figura) {
        const imagen = figura.querySelector('.t-figure__media img');
        if (!imagen) return;
        const { etiqueta } = leerPie(figura);

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 't-figure__open';
        boton.setAttribute('aria-haspopup', 'dialog');
        boton.setAttribute('aria-label', `Ampliar ${etiqueta || 'figura'} y ver información adicional`);
        imagen.replaceWith(boton);
        boton.append(imagen);
        boton.insertAdjacentHTML('beforeend', `
            <span class="t-figure__hint" aria-hidden="true">
                <i class="fas fa-magnifying-glass-plus"></i> Ampliar
            </span>`);
        boton.addEventListener('click', () => abrir(figura, boton));
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.t-article .t-figure[data-ampliable]').forEach(prepararFigura);
    });
})();
