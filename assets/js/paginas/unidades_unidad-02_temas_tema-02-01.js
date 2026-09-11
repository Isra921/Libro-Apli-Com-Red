
        let sidebarOpen = false;

        const menuToggle = document.getElementById('menuToggle');
        const sidebarNav = document.getElementById('sidebarNav');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        function toggleSidebar() {
            sidebarOpen = !sidebarOpen;
            
            if (sidebarOpen) {
                sidebarNav.classList.add('active');
                sidebarOverlay.classList.add('active');
                menuToggle.classList.add('active');
                menuToggle.innerHTML = '<i class="fas fa-times"></i>';
                document.body.style.overflow = 'hidden';
            } else {
                sidebarNav.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                document.body.style.overflow = 'auto';
            }
            
            updateContainerSpacing();
        }

        menuToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleSidebar();
                }
            });
        });

        function updateContainerSpacing() {
            const container = document.querySelector('.container');
            
            if (window.innerWidth <= 768) {
                container.style.marginLeft = '20px';
                container.style.marginRight = '20px';
                container.style.padding = '10px';
            } else if (sidebarOpen && window.innerWidth > 768) {
                container.style.marginLeft = '370px';
                container.style.marginRight = '90px';
                container.style.padding = '20px';
            } else {
                container.style.marginLeft = '90px';
                container.style.marginRight = '90px';
                container.style.padding = '20px';
            }
        }

        function updateActiveSection() {
            const sections = document.querySelectorAll('.section');
            const navItems = document.querySelectorAll('.nav-item[data-section]');
            let currentSectionId = '';

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 150 && rect.bottom >= 150) {
                    currentSectionId = section.id;
                }
            });

            navItems.forEach(item => {
                const sectionId = 'seccion-' + item.dataset.section;
                if (sectionId === currentSectionId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        function updateReadingProgress() {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('progressBar').style.width = scrolled + '%';
        }

        const scrollToTopBtn = document.getElementById('scrollToTop');

        function toggleScrollToTopBtn() {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        }

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        window.addEventListener('scroll', () => {
            updateActiveSection();
            updateReadingProgress();
            toggleScrollToTopBtn();
        });

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                
                if (target) {
                    const offsetTop = target.offsetTop - 100;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebarOpen) {
                toggleSidebar();
            }
            updateContainerSpacing();
        });

        document.addEventListener('DOMContentLoaded', function() {
            updateActiveSection();
            updateReadingProgress();
            updateContainerSpacing();
            if (window.innerWidth <= 768) {
                sidebarNav.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebarOpen) {
                toggleSidebar();
            }
            if (e.key === 'm' || e.key === 'M') {
                if (!e.ctrlKey && !e.altKey) { 
                    toggleSidebar();
                }
            }
        });
    


