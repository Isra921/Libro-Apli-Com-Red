let sidebarOpen = false;

const menuToggle = document.getElementById("menuToggle");
const sidebarNav = document.getElementById("sidebarNav");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;

  if (sidebarOpen) {
    sidebarNav.classList.add("active");
    sidebarOverlay.classList.add("active");
    menuToggle.classList.add("active");
    menuToggle.innerHTML = '<i class="fas fa-times"></i>';
    document.body.style.overflow = "hidden";
  } else {
    sidebarNav.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    menuToggle.classList.remove("active");
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.style.overflow = "auto";
  }

  updateContainerSpacing();
}

menuToggle.addEventListener("click", toggleSidebar);
sidebarOverlay.addEventListener("click", toggleSidebar);

document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
  item.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  });
});

function updateContainerSpacing() {
  const container = document.querySelector(".container");

  if (!container) {
    return;
  }

  container.classList.toggle(
    "sidebar-abierto",
    sidebarOpen && window.innerWidth > 768,
  );
}

function updateActiveSection() {
  const sections = document.querySelectorAll(".section");
  const navItems = document.querySelectorAll(".nav-item[data-section]");
  let currentSectionId = "";

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 150 && rect.bottom >= 150) {
      currentSectionId = section.id;
    }
  });

  navItems.forEach((item) => {
    const sectionId = "seccion-" + item.dataset.section;
    if (sectionId === currentSectionId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function updateReadingProgress() {
  const winScroll =
    document.body.scrollTop || document.documentElement.scrollTop;
  const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  document.getElementById("progressBar").style.width = scrolled + "%";
}

const scrollToTopBtn = document.getElementById("scrollToTop");

function toggleScrollToTopBtn() {
  if (window.pageYOffset > 300) {
    scrollToTopBtn.classList.add("visible");
  } else {
    scrollToTopBtn.classList.remove("visible");
  }
}

scrollToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

window.addEventListener("scroll", () => {
  updateActiveSection();
  updateReadingProgress();
  toggleScrollToTopBtn();
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));

    if (target) {
      const offsetTop = target.offsetTop - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768 && sidebarOpen) {
    toggleSidebar();
  }
  updateContainerSpacing();
});

document.addEventListener("DOMContentLoaded", function () {
  updateActiveSection();
  updateReadingProgress();
  updateContainerSpacing();
  if (window.innerWidth <= 768) {
    sidebarNav.classList.remove("active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebarOpen) {
    toggleSidebar();
  }
  if (e.key === "m" || e.key === "M") {
    if (!e.ctrlKey && !e.altKey) {
      toggleSidebar();
    }
  }
});
(function () {
  const nodos = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const aristas = ["AB", "AC", "BD", "BE", "CF", "CG", "CH"];

  const explicacion = document.getElementById("explicacion");
  const textoExtra = document.getElementById("textoExtra");
  const botones = document.querySelectorAll(".botones button");

  const demos = {
    caminoAH: {
      nodos: ["A", "C", "H"],
      aristas: ["AC", "CH"],
      texto: "Camino de A a H: A â†’ C â†’ H.",
      extra:
        "Un camino es una lista de ramas contiguas que van de un nodo a otro.",
    },
    caminoAE: {
      nodos: ["A", "B", "E"],
      aristas: ["AB", "BE"],
      texto: "Camino de A a E: A â†’ B â†’ E.",
      extra:
        "Existe exactamente un camino entre la raÃ­z y cada uno de los otros nodos en el Ã¡rbol.",
    },
    longitudAH: {
      nodos: ["A", "C", "H"],
      aristas: ["AC", "CH"],
      texto:
        "La longitud de un camino se obtiene por el nÃºmero de nodos del camino menos uno o de forma equivalente, es el nÃºmero de arcos que existen de un nodo a otro.",
      extra: "Longitud de A a H: 2",
    },
    caminoCero: {
      nodos: ["B"],
      aristas: [],
      texto: "Hay un camino de longitud cero de cualquier nodo a sÃ­ mismo.",
      extra: "Longitud de B a B: 0",
    },
    gradoC: {
      nodos: ["C", "F", "G", "H"],
      aristas: ["CF", "CG", "CH"],
      texto:
        "El grado de un Nodo es el nÃºmero de ramas o de forma equivalente, nÃºmero de hijos que parten de Ã©l.",
      extra: "Grado de C: 3",
    },
    gradoArbol: {
      nodos: ["C", "F", "G", "H"],
      aristas: ["CF", "CG", "CH"],
      texto: "El grado de un Ã¡rbol es el grado mÃ¡ximo de los nodos del Ã¡rbol.",
      extra:
        "El Grado mÃ¡ximo de los Nodos es 3, por lo tanto, el Ãrbol es de Grado 3",
    },
    niveles: {
      nodos: ["A", "B", "C", "D", "E", "F", "G", "H"],
      aristas: [],
      niveles: true,
      texto:
        "El nivel de un nodo es la longitud del camino que lo conecta al nodo raÃ­z.",
      extra: "A: nivel 0 | B y C: nivel 1 | D, E, F, G y H: nivel 2",
    },
    profundidadE: {
      nodos: ["A", "B", "E"],
      aristas: ["AB", "BE"],
      texto:
        "La profundidad de un nodo n es el largo del camino entre la raÃ­z del Ã¡rbol y el nodo n. La profundidad de la raÃ­z es siempre 0.",
      extra: "Profundidad de E: 2",
    },
    alturaC: {
      nodos: ["C", "F", "G", "H"],
      aristas: ["CF", "CG", "CH"],
      texto:
        "La altura de un nodo n es el mÃ¡ximo largo de camino desde n hasta alguna hoja. La altura de toda hoja es 0. La altura de un Ã¡rbol tiene el mismo valor que la profundidad de la hoja mÃ¡s profunda. La altura de un Ã¡rbol vacÃ­o es -1.",
      extra: "Altura de C: 1",
    },
    subarboles: {
      nodos: ["B", "D", "E", "C", "F", "G", "H"],
      aristas: ["BD", "BE", "CF", "CG", "CH"],
      subarboles: true,
      texto:
        "Un subÃ¡rbol de un Ã¡rbol es un subconjunto de nodos del Ã¡rbol conectados por ramas del propio Ã¡rbol.",
      extra: "SubÃ¡rbol izquierdo: B-D-E | SubÃ¡rbol derecho: C-F-G-H",
    },
  };

  function limpiar() {
    nodos.forEach((id) => {
      const nodo = document.getElementById(id);
      nodo.classList.remove("resaltado", "oscuro", "seleccionado");
    });

    aristas.forEach((id) => {
      const arista = document.getElementById(id);
      arista.classList.remove("resaltada");
      arista.style.animationDelay = "0s";
    });

    [
      "nivel0",
      "nivel1",
      "nivel2",
      "nivelTexto0",
      "nivelTexto1",
      "nivelTexto2",
    ].forEach((id) => {
      document.getElementById(id).classList.remove("visible");
    });

    document.getElementById("zonaIzquierda").classList.remove("visible");
    document.getElementById("zonaDerecha").classList.remove("visible");

    textoExtra.textContent = "";
  }

  function animar(demoNombre) {
    limpiar();
    // -------------------------------
    // Modo interactivo: elegir nodo inicial y final
    // -------------------------------

    const conexiones = {
      A: ["B", "C"],
      B: ["A", "D", "E"],
      C: ["A", "F", "G", "H"],
      D: ["B"],
      E: ["B"],
      F: ["C"],
      G: ["C"],
      H: ["C"],
    };

    let nodoInicial = null;

    function obtenerArista(a, b) {
      return document.getElementById(a + b) || document.getElementById(b + a);
    }

    function encontrarCamino(inicio, fin) {
      const cola = [[inicio]];
      const visitados = new Set();

      while (cola.length > 0) {
        const camino = cola.shift();
        const actual = camino[camino.length - 1];

        if (actual === fin) {
          return camino;
        }

        if (!visitados.has(actual)) {
          visitados.add(actual);

          conexiones[actual].forEach((vecino) => {
            const nuevoCamino = [...camino, vecino];
            cola.push(nuevoCamino);
          });
        }
      }

      return [];
    }

    function animarCaminoLibre(camino) {
      limpiar();

      textoExtra.textContent = "Camino seleccionado: " + camino.join(" â†’ ");

      explicacion.innerHTML = `
                  <strong>Camino seleccionado:</strong><br>
                  ${camino.join(" â†’ ")}<br>
                  Longitud del camino: ${camino.length - 1}
              `;

      camino.forEach((id, i) => {
        setTimeout(() => {
          document.getElementById(id).classList.add("resaltado");
        }, i * 350);
      });

      for (let i = 0; i < camino.length - 1; i++) {
        const arista = obtenerArista(camino[i], camino[i + 1]);

        if (arista) {
          setTimeout(
            () => {
              arista.classList.add("resaltada");
            },
            (i + 1) * 350,
          );
        }
      }
    }

    nodos.forEach((id) => {
      document.getElementById(id).addEventListener("click", () => {
        botones.forEach((b) => b.classList.remove("activo"));

        if (nodoInicial === null) {
          limpiar();

          nodoInicial = id;
          document.getElementById(id).classList.add("seleccionado");

          explicacion.innerHTML = `
                          <strong>Nodo inicial seleccionado: ${id}</strong><br>
                          Ahora selecciona el nodo final para colorear el camino.
                      `;

          textoExtra.textContent = "Nodo inicial: " + id;
        } else {
          const nodoFinal = id;
          const camino = encontrarCamino(nodoInicial, nodoFinal);

          animarCaminoLibre(camino);

          nodoInicial = null;
        }
      });
    });
    botones.forEach((b) =>
      b.classList.toggle("activo", b.dataset.demo === demoNombre),
    );

    const demo = demos[demoNombre];
    explicacion.innerHTML =
      "<strong>" + demo.texto + "</strong><br>" + demo.extra;
    textoExtra.textContent = demo.extra;

    demo.nodos.forEach((id, i) => {
      setTimeout(() => {
        document.getElementById(id).classList.add("resaltado");
      }, i * 350);
    });

    demo.aristas.forEach((id, i) => {
      setTimeout(
        () => {
          const arista = document.getElementById(id);
          arista.classList.add("resaltada");
          arista.style.animationDelay = "0s";
        },
        (i + 1) * 350,
      );
    });

    if (demoNombre === "caminoCero") {
      document.getElementById("B").classList.add("oscuro");
    }

    if (demo.niveles) {
      setTimeout(() => {
        [
          "nivel0",
          "nivel1",
          "nivel2",
          "nivelTexto0",
          "nivelTexto1",
          "nivelTexto2",
        ].forEach((id) => {
          document.getElementById(id).classList.add("visible");
        });
      }, 500);
    }

    if (demo.subarboles) {
      setTimeout(() => {
        document.getElementById("zonaIzquierda").classList.add("visible");
        document.getElementById("zonaDerecha").classList.add("visible");
      }, 500);
    }
  }

  botones.forEach((boton) => {
    boton.addEventListener("click", () => animar(boton.dataset.demo));
  });

  // AnimaciÃ³n inicial automÃ¡tica
  animar("caminoAH");
})();
document.addEventListener("DOMContentLoaded", () => {
  const figuras = document.querySelectorAll(".figura");

  figuras.forEach((figura) => {
    // 1. Crear el contenedor del Ã­cono
    const iconWrapper = document.createElement("div");
    iconWrapper.classList.add("icono-expandir");

    // 2. Insertar un SVG de expansiÃ³n simple
    iconWrapper.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;

    // 3. AÃ±adirlo al contenedor de la figura
    figura.appendChild(iconWrapper);
  });
});


