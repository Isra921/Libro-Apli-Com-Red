
        function toggleCard(cardIdSuffix) {
            const card = document.getElementById(`card-${cardIdSuffix}`);
            const wasActive = card.classList.contains('active');
            
            const allCards = document.querySelectorAll('.card');
            allCards.forEach(c => {
                if (c.id !== `card-${cardIdSuffix}` && c.classList.contains('active')) {
                    c.classList.remove('active');
                }
            });
            
            if (!wasActive) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }

        // Funciones para el modal del video
        function openVideoModal() {
            console.log('Abriendo modal de video...');
            const modal = document.getElementById('videoModal');
            const videoFrame = document.getElementById('videoFrame');
            
            if (!modal || !videoFrame) {
                console.error('No se encontraron los elementos del modal');
                return;
            }
            
            // Video Unidad 2: Estructura de datos
            videoFrame.src = 'https://www.youtube.com/embed/-hjFMM17DHw';
            
            modal.classList.add('show');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('Modal abierto correctamente');
        }

        function closeVideoModal() {
            console.log('Cerrando modal de video...');
            const modal = document.getElementById('videoModal');
            const videoFrame = document.getElementById('videoFrame');
            
            if (!modal || !videoFrame) {
                console.error('No se encontraron los elementos del modal');
                return;
            }
            
            // Detener el video removiendo la fuente
            videoFrame.src = '';
            
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('Modal cerrado correctamente');
        }

        // Cerrar modal al hacer clic fuera del contenido
        document.getElementById('videoModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeVideoModal();
            }
        });

        // Cerrar modal con la tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeVideoModal();
            }
        });
        
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (!card.classList.contains('active')) {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateY = (x - centerX) / 25;
                    const rotateX = (centerY - y) / 25;
                    
                    const maxRotation = 8;
                    const clampedRotateX = Math.max(Math.min(rotateX, maxRotation), -maxRotation);
                    const clampedRotateY = Math.max(Math.min(rotateY, maxRotation), -maxRotation);
                    
                    card.style.transform = `perspective(1200px) 
                                          rotateX(${clampedRotateX}deg) 
                                          rotateY(${clampedRotateY}deg) 
                                          translateY(-8px)
                                          scale(1.02)`;
                }
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateY(0) scale(1)';
            });
        });
        
        document.addEventListener('click', (e) => {
            const cards = document.querySelectorAll('.card');
            let isClickInsideACard = false;
            
            cards.forEach(card => {
                if (card.contains(e.target)) {
                    isClickInsideACard = true;
                }
            });
            
            if (!isClickInsideACard) {
                cards.forEach(card => {
                    card.classList.remove('active');
                });
            }
        });
    


