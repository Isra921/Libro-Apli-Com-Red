

        
       function switchActUnit(unitId, btn) {
    document.querySelectorAll('.act-unit-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn-act').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--text-muted-light)';
    });
    
    const target = document.getElementById(unitId);
    if (target) {
        target.style.display = 'block';
        btn.style.background = 'var(--secondary)';
        btn.style.color = 'white';
    }
}

        
        
        // --- FUNCIONES DEL GLOSARIO FLOTANTE ---
        function openGlosarioModal() {
            const modal = document.getElementById('glosarioModal');
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeGlosarioModal() {
            const modal = document.getElementById('glosarioModal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }

        function switchUnit(unitId, btn) {
            document.querySelectorAll('.unit-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            
            const targetUnit = document.getElementById(unitId);
            if (targetUnit) {
                targetUnit.classList.add('active');
                btn.classList.add('active');
            }
        }

        const glosarioModalEl = document.getElementById('glosarioModal');
        if (glosarioModalEl) {
            glosarioModalEl.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeGlosarioModal();
                }
            });
        }

        // --- MANEJO DE MODALES GENERALES DEL MEN ---
        const modalContainer = document.getElementById('modal-container');
        const modalCloseButton = document.getElementById('modal-close-button');
        const cardsWithModal = document.querySelectorAll('.card[data-modal]');

        function openModal(modalId) {
            document.querySelectorAll('.modal-section').forEach(section => section.classList.remove('active'));
            const activeSection = document.getElementById(`modal-${modalId}`);
            if (activeSection) {
                activeSection.classList.add('active');
                if (modalContainer) modalContainer.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal() {
            if (modalContainer) {
                modalContainer.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }

        cardsWithModal.forEach(card => {
            card.addEventListener('click', () => {
                const modalId = card.getAttribute('data-modal');
                openModal(modalId);
            });
        });

        if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
        if (modalContainer) {
            modalContainer.addEventListener('click', e => {
                if (e.target === modalContainer) closeModal();
            });
        }

        // --- EFECTO 3D HOVER (DESKTOP) ---
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouchDevice) {
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('mousemove', (e) => {
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
                    
                    card.style.transform = `perspective(1200px) rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg) translateY(-8px) scale(1.02)`;
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateY(0) scale(1)';
                });
            });
        }

        // --- REPRODUCTOR DE VIDEO ---
        const videoOverlay = document.getElementById('video-player-overlay');
        const videoFrame = document.getElementById('main-video-frame');

        function playVideo(videoId) {
            if (videoFrame && videoOverlay) {
                videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                videoOverlay.classList.add('show');
            }
        }

        function closeVideoPlayer() {
            if (videoOverlay && videoFrame) {
                videoOverlay.classList.remove('show');
                videoFrame.src = '';
            }
        }

        if (videoOverlay) {
            videoOverlay.addEventListener('click', (e) => {
                if (e.target === videoOverlay) closeVideoPlayer();
            });
        }
    


