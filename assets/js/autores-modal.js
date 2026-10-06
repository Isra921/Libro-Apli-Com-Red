// ==========================================================================
// VENTANA EMERGENTE · AUTORES
// --------------------------------------------------------------------------
// - Los datos viven en assets/data/autores.json (docentes y equipo).
// - Solo construye el contenido (tarjetas); la ventana, las pestañas y la
//   accesibilidad las pone ventana-modal.js.
// - Se abre con cualquier elemento [data-modal="autores"].
// - Requiere data-manager.js y ventana-modal.js (cargados antes).
// ==========================================================================
(function () {
    const ID_VENTANA = 'autores';
    const RUTA_DATOS = 'assets/data/autores.json?v=20261006_snii';
    const { el, icono } = VentanaModal;

    function nombreCompleto(persona) {
        return [persona.grado, persona.nombre].filter(Boolean).join(' ');
    }

    /** Foto de la persona o, si no hay, un marcador con ícono. */
    function crearFoto(persona, clase, etiquetas) {
        if (persona.foto) {
            const img = el('img', clase);
            img.src = DataManager.ruta(persona.foto);
            img.alt = nombreCompleto(persona);
            img.loading = 'lazy';
            return img;
        }
        const marcador = el('div', `${clase} au-foto--vacia`);
        marcador.setAttribute('role', 'img');
        marcador.setAttribute('aria-label', etiquetas.sin_foto);
        marcador.append(icono('fa-user'));
        return marcador;
    }

    function crearCorreo(correo) {
        if (!correo) return null;
        const enlace = el('a', 'au-correo', correo);
        enlace.href = `mailto:${correo}`;
        return enlace;
    }

    // ---------- Tarjetas ----------
    function tarjetaDocente(persona, etiquetas) {
        const tarjeta = el('article', 'au-docente');
        const info = el('div', 'au-docente__info');

        info.append(el('h3', 'au-nombre', nombreCompleto(persona)));
        const correo = crearCorreo(persona.correo);
        if (correo) info.append(correo);

        (persona.semblanza || []).forEach((parrafo, indice) => {
            const p = el('p', 'au-texto');
            if (indice === 0) p.append(el('strong', '', `${etiquetas.semblanza}: `));
            p.append(parrafo);
            info.append(p);
        });

        if (persona.areas && persona.areas.length) {
            const bloque = el('div', 'au-areas');
            bloque.append(el('strong', 'au-areas__titulo', `${etiquetas.areas}:`));
            const lista = el('ul', 'au-areas__lista');
            persona.areas.forEach(area => lista.append(el('li', 'au-chip', area)));
            bloque.append(lista);
            info.append(bloque);
        }

        tarjeta.append(crearFoto(persona, 'au-docente__foto', etiquetas), info);
        return tarjeta;
    }

    function tarjetaColaborador(persona) {
        const tarjeta = el('div', 'collaborator-card');

        const ring = el('div', 'avatar-ring');
        const circle = el('div', 'avatar-circle');
        circle.append(icono('fa-user'));
        ring.append(circle);
        tarjeta.append(ring);

        const info = el('div', 'collaborator-info');
        info.append(el('h4', '', persona.nombre));
        if (persona.correo) {
            info.append(el('p', 'email', persona.correo));
        }
        tarjeta.append(info);

        return tarjeta;
    }

    const CONSTRUCTORES = {
        docente: { contenedor: 'au-lista-docentes', tarjeta: tarjetaDocente },
        colaborador: { contenedor: 'collaborator-grid', tarjeta: tarjetaColaborador }
    };

    /** Contenido de una sección (lo que va dentro de su pestaña). */
    function contenidoSeccion(seccion, etiquetas, conPestanas) {
        const fragmento = document.createDocumentFragment();
        // Con pestañas, la pestaña ya nombra la sección: no se repite el subtítulo
        if (!conPestanas) fragmento.append(el('h3', 'au-panel__titulo', seccion.titulo));
        if (seccion.descripcion) fragmento.append(el('p', 'au-panel__descripcion', seccion.descripcion));

        const constructor = CONSTRUCTORES[seccion.tipo] || CONSTRUCTORES.colaborador;
        const lista = el('div', constructor.contenedor);
        seccion.personas.forEach(persona => lista.append(constructor.tarjeta(persona, etiquetas)));
        fragmento.append(lista);
        return fragmento;
    }

    VentanaModal.registrar(ID_VENTANA, async () => {
        const datos = await DataManager.getArchivo(RUTA_DATOS);
        const conPestanas = datos.secciones.length > 1;
        return {
            titulo: datos.titulo,
            botonCerrar: datos.boton_cerrar,
            secciones: datos.secciones.map(seccion => ({
                id: seccion.id,
                pestana: seccion.pestana,
                contenido: contenidoSeccion(seccion, datos.etiquetas, conPestanas)
            }))
        };
    });
})();
