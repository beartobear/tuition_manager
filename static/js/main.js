// main.js - shared functionality
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle (desktop collapse)
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.btn-toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('collapsed');
            // Save state to localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        });
    }

    // Restore sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true' && sidebar) {
        sidebar.classList.add('collapsed');
    }

    // Mobile sidebar open/close via hamburger (if needed)
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile (optional)
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(event.target) && !mobileToggle?.contains(event.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Highlight active nav link based on current URL
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-nav a, .bottom-nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        } else if (href !== '/' && currentPath.startsWith(href)) {
            link.classList.add('active');
        }
    });
});