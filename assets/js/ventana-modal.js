// ==========================================================================
// COMPONENTE BASE · VENTANA EMERGENTE (.vm-*)
// --------------------------------------------------------------------------
// Estructura y comportamiento comunes a todas las ventanas emergentes del
// sitio (Autores, Glosario, …). Cada ventana concreta solo construye su
// contenido y se registra aquí:
//
//   VentanaModal.registrar('glosario', async () => ({
//       titulo: 'Glosario de términos',
//       botonCerrar: 'Cerrar ventana',
//       secciones: [{ id: 'unidad-01', pestana: 'Unidad 1', contenido: nodoHTML }]
//   }));
//
// - Se abre con cualquier elemento [data-modal="<id>"] (delegación de eventos,
//   funciona aunque el menú se dibuje después).
// - La ventana se construye la primera vez que se abre (carga diferida).
// - Si hay más de una sección se muestran pestañas; con una sola, no.
// - Accesibilidad: Esc cierra, el foco no sale de la ventana, flechas
//   izquierda/derecha cambian de pestaña y el foco vuelve al botón de origen.
// ==========================================================================
const VentanaModal = (function () {
    const CLASE_ABIERTO = 'is-open';
    const CLASE_BODY_BLOQUEADO = 'vm-abierta';
    const SELECTOR_ENFOCABLES = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const registro = new Map(); // id → { cargar, overlay }
    let activa = null;          // { id, overlay, disparador }

    // ---------- Utilidades ----------
    function el(etiqueta, clase, texto) {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        if (texto) nodo.textContent = texto;
        return nodo;
    }

    function icono(clase) {
        const i = el('i', `fas ${clase}`);
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    // ---------- Construcción ----------
    function seleccionarPestana(overlay, idSeccion) {
        overlay.querySelectorAll('[role="tab"]').forEach(tab => {
            const activaTab = tab.dataset.seccion === idSeccion;
            tab.setAttribute('aria-selected', String(activaTab));
            tab.tabIndex = activaTab ? 0 : -1;
        });
        overlay.querySelectorAll('.vm__panel').forEach(panel => {
            panel.hidden = panel.dataset.seccion !== idSeccion;
        });
        overlay.querySelector('.vm__body').scrollTop = 0;
    }

    function construir(id, config) {
        const conPestanas = config.secciones.length > 1;
        const idTitulo = `vm-${id}-titulo`;

        const overlay = el('div', `vm vm--${id}`);
        overlay.hidden = true;

        const dialogo = el('div', 'vm__dialog');
        dialogo.setAttribute('role', 'dialog');
        dialogo.setAttribute('aria-modal', 'true');
        dialogo.setAttribute('aria-labelledby', idTitulo);

        const encabezado = el('header', 'vm__header');
        const titulo = el('h2', 'vm__title', config.titulo);
        titulo.id = idTitulo;
        const cerrar = el('button', 'vm__close');
        cerrar.type = 'button';
        cerrar.setAttribute('aria-label', config.botonCerrar);
        cerrar.append(icono('fa-times'));
        cerrar.addEventListener('click', cerrarActiva);
        encabezado.append(titulo, cerrar);
        dialogo.append(encabezado);

        if (conPestanas) {
            const pestanas = el('div', 'vm__tabs');
            pestanas.setAttribute('role', 'tablist');
            config.secciones.forEach(seccion => {
                const tab = el('button', 'vm__tab', seccion.pestana);
                tab.type = 'button';
                tab.id = `vm-${id}-tab-${seccion.id}`;
                tab.dataset.seccion = seccion.id;
                tab.setAttribute('role', 'tab');
                tab.setAttribute('aria-controls', `vm-${id}-panel-${seccion.id}`);
                tab.addEventListener('click', () => seleccionarPestana(overlay, seccion.id));
                pestanas.append(tab);
            });
            dialogo.append(pestanas);
        }

        const cuerpo = el('div', 'vm__body');
        config.secciones.forEach(seccion => {
            const panel = el('section', 'vm__panel');
            panel.id = `vm-${id}-panel-${seccion.id}`;
            panel.dataset.seccion = seccion.id;
            if (conPestanas) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', `vm-${id}-tab-${seccion.id}`);
            }
            panel.append(seccion.contenido);
            cuerpo.append(panel);
        });
        dialogo.append(cuerpo);

        overlay.append(dialogo);
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrarActiva(); });
        overlay.addEventListener('keydown', manejarTeclado);
        document.body.append(overlay);

        seleccionarPestana(overlay, config.secciones[0].id);
        return overlay;
    }

    // ---------- Abrir / cerrar ----------
    async function abrir(id, disparador) {
        const entrada = registro.get(id);
        if (!entrada) return;
        if (activa) cerrarActiva();

        if (!entrada.overlay) {
            try {
                entrada.overlay = construir(id, await entrada.cargar());
            } catch (error) {
                console.error(`[Ventana ${id}] ${error.archivo || ''} ${error.message}`);
                return;
            }
        }

        const overlay = entrada.overlay;
        activa = { id, overlay, disparador };
        overlay.hidden = false;
        requestAnimationFrame(() => overlay.classList.add(CLASE_ABIERTO));
        document.body.classList.add(CLASE_BODY_BLOQUEADO);
        overlay.querySelector('.vm__close').focus();
    }

    function cerrarActiva() {
        if (!activa) return;
        const { overlay, disparador } = activa;
        overlay.classList.remove(CLASE_ABIERTO);
        overlay.hidden = true;
        document.body.classList.remove(CLASE_BODY_BLOQUEADO);
        activa = null;
        if (disparador instanceof HTMLElement) disparador.focus();
    }

    function manejarTeclado(e) {
        const overlay = e.currentTarget;

        if (e.key === 'Escape') {
            cerrarActiva();
            return;
        }

        if (e.key === 'Tab') {
            const enfocables = [...overlay.querySelectorAll(SELECTOR_ENFOCABLES)]
                .filter(nodo => !nodo.closest('[hidden]'));
            if (!enfocables.length) return;
            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];
            if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            }
            return;
        }

        const tabActual = e.target.closest('[role="tab"]');
        if (tabActual && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            const tabs = [...overlay.querySelectorAll('[role="tab"]')];
            const paso = e.key === 'ArrowRight' ? 1 : -1;
            const siguiente = tabs[(tabs.indexOf(tabActual) + paso + tabs.length) % tabs.length];
            seleccionarPestana(overlay, siguiente.dataset.seccion);
            siguiente.focus();
        }
    }

    // Delegación: cualquier [data-modal="<id>"] registrado abre su ventana
    document.addEventListener('click', e => {
        const origen = e.target.closest('[data-modal]');
        if (!origen || !registro.has(origen.dataset.modal)) return;
        e.preventDefault();
        abrir(origen.dataset.modal, origen);
    });

    return {
        /** Registra una ventana: cargar() devuelve { titulo, botonCerrar, secciones[] }. */
        registrar(id, cargar) {
            registro.set(id, { cargar, overlay: null });
        },
        abrir,
        cerrar: cerrarActiva,
        /** Utilidades de construcción para las ventanas concretas. */
        el,
        icono
    };
})();
