document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll(".figura img");

  images.forEach((img) => {
    new Viewer(img, {
      inline: false,
      navbar: false,
      title: false,

      toolbar: {
        zoomIn: 1,
        zoomOut: 1,
        oneToOne: 0,
        reset: 1,
        prev: 0,
        play: 0,
        next: 0,
        rotateLeft: 0,
        rotateRight: 0,
        flipHorizontal: 0,
        flipVertical: 0,
      },

      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false,
      transition: true,

      viewed(event) {
        const viewer = this.viewer;
        const imagenVisor = event.detail.image;

        if (!viewer || !imagenVisor) {
          return;
        }

        const anchoNatural = imagenVisor.naturalWidth;
        const altoNatural = imagenVisor.naturalHeight;

        if (!anchoNatural || !altoNatural) {
          return;
        }

        // Ãrea mÃ¡xima que puede ocupar la imagen.
        const anchoDisponible = window.innerWidth * 0.85;
        const altoDisponible = window.innerHeight * 0.75;

        /*
         * Escala necesaria para que la imagen ocupe buena parte
         * de la pantalla sin salirse.
         */
        const escalaPorAncho = anchoDisponible / anchoNatural;
        const escalaPorAlto = altoDisponible / altoNatural;

        const escalaAjustada = Math.min(escalaPorAncho, escalaPorAlto);

        /*
         * Solo ampliamos imÃ¡genes cuyo tamaÃ±o natural es pequeÃ±o.
         * Las imÃ¡genes grandes se quedan con el ajuste automÃ¡tico
         * de Viewer.js.
         */
        const imagenPequena = anchoNatural * altoNatural < 600000;

        if (imagenPequena && escalaAjustada > 1) {
          viewer.zoomTo(escalaAjustada);
        }
      },
    });
  });
});


