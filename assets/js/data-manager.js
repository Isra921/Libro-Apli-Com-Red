// ==========================================================================
// DATA MANAGER · Carga de datos de las unidades (JSON)
// --------------------------------------------------------------------------
// - Todas las rutas de los JSON se escriben desde la RAÍZ del sitio
//   (ej. "unidades/unidad-01/temas/tema-01-01.html").
// - Cada página indica en <body data-root="..."> cuántos niveles debe subir
//   para llegar a la raíz ("" en la raíz, "../../" dentro de unidades/unidad-XX/).
// - Guarda en caché cada archivo para no repetir peticiones fetch.
// ==========================================================================

class DataError extends Error {
    constructor(archivo, mensaje) {
        super(mensaje);
        this.name = 'DataError';
        this.archivo = archivo;
    }
}

const DataManager = {
    RUTA_CATALOGO: 'assets/data/unidades-data.json',
    CARPETA_UNIDADES: 'assets/data/unidades/',
    PATRON_PAGINA_UNIDAD: id => `unidades/${id}/index.html`,
    PATRON_URL_ABSOLUTA: /^(?:[a-z]+:)?\/\//i,

    _cache: new Map(),

    /** Prefijo relativo para llegar a la raíz del sitio desde la página actual. */
    raiz() {
        return document.body.dataset.root || '';
    },

    /** Convierte una ruta escrita desde la raíz en una ruta válida para esta página. */
    ruta(rutaDesdeRaiz) {
        if (!rutaDesdeRaiz) return '';
        if (this.PATRON_URL_ABSOLUTA.test(rutaDesdeRaiz) || rutaDesdeRaiz.startsWith('#')) {
            return rutaDesdeRaiz;
        }
        return `${this.raiz()}${rutaDesdeRaiz}`;
    },

    /** Descarga y valida un JSON. Lanza DataError con un mensaje legible si falla. */
    async _cargarJSON(rutaDesdeRaiz) {
        if (this._cache.has(rutaDesdeRaiz)) return this._cache.get(rutaDesdeRaiz);

        const promesa = (async () => {
            let respuesta;
            try {
                respuesta = await fetch(this.ruta(rutaDesdeRaiz));
            } catch (error) {
                throw new DataError(rutaDesdeRaiz,
                    'No se pudo leer el archivo. Si abriste la página con doble clic, ábrela con un servidor local (por ejemplo, Live Server).');
            }
            if (!respuesta.ok) {
                throw new DataError(rutaDesdeRaiz, `El archivo no existe o no está disponible (HTTP ${respuesta.status}).`);
            }
            const texto = await respuesta.text();
            try {
                return JSON.parse(texto);
            } catch (error) {
                throw new DataError(rutaDesdeRaiz,
                    `El archivo tiene un error de formato: ${error.message}. Revisa comas, comillas y llaves.`);
            }
        })();

        this._cache.set(rutaDesdeRaiz, promesa);
        // Si falla, se elimina de la caché para permitir reintentos.
        promesa.catch(() => this._cache.delete(rutaDesdeRaiz));
        return promesa;
    },

    /** Datos generales del catálogo: título, descripción y orden de las unidades. */
    async getCatalogo() {
        return this._cargarJSON(this.RUTA_CATALOGO);
    },

    /** Datos completos de una unidad (assets/data/unidades/<id>.json). */
    async getUnidad(idUnidad) {
        return this._cargarJSON(`${this.CARPETA_UNIDADES}${idUnidad}.json`);
    },

    /** Todas las unidades, en el orden definido en el catálogo. */
    async getUnidades() {
        const catalogo = await this.getCatalogo();
        return Promise.all(catalogo.unidades.map(id => this.getUnidad(id)));
    },

    /** Cualquier otro JSON del sitio (ej. bancos de preguntas de las actividades). */
    async getArchivo(rutaDesdeRaiz) {
        return this._cargarJSON(rutaDesdeRaiz);
    },

    /** Ruta (ya ajustada a la página actual) hacia la página de una unidad. */
    urlUnidad(idUnidad) {
        return this.ruta(this.PATRON_PAGINA_UNIDAD(idUnidad));
    }
};
