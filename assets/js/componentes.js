// ==========================================================================
// CARGADOR DE COMPONENTES GLOBALES
// --------------------------------------------------------------------------
// Cada HTML incluye, al final del <body> y en este orden:
//   <script src=".../assets/js/data-manager.js"></script>
//   <script src=".../assets/js/componentes.js"></script>
//   (y después, si aplica, el script propio de su tipo de página)
//
// Este archivo inserta los componentes listados en COMPONENTES, en orden.
// Para agregar un componente global: crea su archivo en assets/js/ y añade
// su nombre a la lista. No hay que tocar ningún HTML.
//
// Por qué data-manager.js NO está en la lista: las plantillas de página
// (unidad-plantilla.js, tema-plantilla.js, ...) lo usan de inmediato, y los
// scripts insertados desde aquí se ejecutan después de ellas.
// ==========================================================================
(function () {
    const COMPONENTES = [
        'nav-global.js',     // Menú superior generado desde navegacion.json
        'ventana-modal.js',  // Base de las ventanas emergentes (debe ir antes que ellas)
        'autores-modal.js?v=20261006_snii',     // Ventana emergente de Autores
        'glosario-modal.js',    // Ventana emergente de Glosario
        'actividades-modal.js', // Ventana emergente de Actividades
        'plan-estudios-modal.js'// Ventana emergente de Plan de Estudios
    ];

    // Carpeta de este archivo; así las rutas no dependen de la profundidad de la página
    const carpeta = new URL('./', document.currentScript.src);

    COMPONENTES.forEach(nombre => {
        const script = document.createElement('script');
        script.src = new URL(nombre, carpeta).href;
        script.async = false; // Conserva el orden de ejecución de la lista
        document.body.append(script);
    });
})();
