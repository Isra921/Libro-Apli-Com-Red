
        // Script para menú móvil
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMenuButton = document.getElementById('close-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        mobileMenuButton.addEventListener('click', () => mobileMenu.classList.add('open'));
        closeMenuButton.addEventListener('click', () => mobileMenu.classList.remove('open'));

        // Script para generar tarjetas de unidades
        document.addEventListener('DOMContentLoaded', () => {
            const units = [
                { id: 1, title: "Unidad I", subtitle: "Contenidos fundamentales", description: "Identifica contenidos fundamentales de la computación con base en sus órdenes de organizaci?n.", icon: "fa-book-open", duration: "3 semanas", topics: ["Tema de ejemplo", "El problema del organizaci?n de informaci?n", "Búsqueda", "Exploración exhaustiva y vuelta atrás"] },
                { id: 2, title: "Unidad II", subtitle: "Recursos digitales lineales", description: "Construye recursos digitales lineales a partir de especificaciones genéricas, considerando la importancia de la pila, cola, listas y tablas hash.", icon: "fa-list", duration: "3 semanas", topics: ["Tema provisional", "Tema provisional", "Listas", "Tablas hash"] },
                { id: 3, title: "Unidad III", subtitle: "Recursos digitales no lineales", description: "Manipula recursos digitales a partir de sus aplicaciones, organizaci?n y representaciones.", icon: "fa-tree", duration: "3 semanas", topics: ["Árboles binarios", "Tema provisional"] }

            ];

            const container = document.getElementById('units-container');

            units.forEach(unit => {
                // Usar <a> como elemento principal de la tarjeta
                const cardLink = document.createElement('a');
                cardLink.className = 'unit-card';
                cardLink.id = `unit-${unit.id}`;
                cardLink.href = `UNIDAD_${unit.id}/index.html`; // El enlace ahora está en el contenedor principal
                
                const topicsHtml = unit.topics.map(topic => `<span class="topic-badge">${topic}</span>`).join('');
                
                cardLink.innerHTML = `
                    <div class="card-header">
                        <div class="header-top">
                            <i class="fas ${unit.icon}"></i>
                            <span class="duration-badge">${unit.duration}</span>
                        </div>
                        <h3 class="card-title">${unit.title}</h3>
                        <h4 class="card-subtitle">${unit.subtitle}</h4>
                    </div>
                    <div class="card-content">
                        <p class="card-description">${unit.description}</p>
                        <div class="topics-section">
                            <p>Temas principales</p>
                            <div class="topics-tags">
                                ${topicsHtml}
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="footer-duration">
                                <i class="far fa-clock"></i>
                                <span>${unit.duration}</span>
                            </div>
                            <div class="explore-link">
                                <span>Explorar</span>
                                <i class="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(cardLink);
            });
        });
    


