/**
 * IICM — Global Mobile Hamburger Nav
 * Injected into every dashboard via <script src="...mobile-nav.js">
 * Works with any portal that has .sidebar + .main-content + .top-navbar
 */
(function () {
    'use strict';

    const MOBILE_BP = 768;

    function isMobile() {
        return window.innerWidth <= MOBILE_BP;
    }

    /* ── Create hamburger button ── */
    function createHamburger() {
        const btn = document.createElement('button');
        btn.className = 'hamburger-btn';
        btn.id = 'iicm-hamburger';
        btn.setAttribute('aria-label', 'Toggle navigation');
        btn.setAttribute('title', 'Open menu');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6"  x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>`;
        btn.style.cssText = 'color:#1b4332;';
        return btn;
    }

    /* ── Create overlay ── */
    function createOverlay() {
        const ov = document.createElement('div');
        ov.className = 'sidebar-overlay';
        ov.id = 'sidebar-overlay';
        document.body.appendChild(ov);
        return ov;
    }

    /* ── Toggle sidebar open/close ── */
    function openSidebar(sidebar, overlay) {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar(sidebar, overlay) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    /* ── Auto-close when a sidebar nav link is clicked ── */
    function bindNavLinks(sidebar, overlay) {
        sidebar.querySelectorAll('a, .sidebar-item').forEach(function (el) {
            el.addEventListener('click', function () {
                if (isMobile()) closeSidebar(sidebar, overlay);
            });
        });
    }

    /* ── Main init ── */
    function init() {
        var sidebar    = document.querySelector('.sidebar');
        var topNavbar  = document.querySelector('.top-navbar');
        var mainContent = document.querySelector('.main-content');

        if (!sidebar || !topNavbar) return;

        /* Already injected? */
        if (document.getElementById('iicm-hamburger')) return;

        var overlay    = createOverlay();
        var hamburger  = createHamburger();

        /* Insert hamburger as first child of top-navbar */
        topNavbar.insertBefore(hamburger, topNavbar.firstChild);

        /* Overlay click closes sidebar */
        overlay.addEventListener('click', function () {
            closeSidebar(sidebar, overlay);
        });

        /* Hamburger click */
        hamburger.addEventListener('click', function () {
            if (sidebar.classList.contains('mobile-open')) {
                closeSidebar(sidebar, overlay);
            } else {
                openSidebar(sidebar, overlay);
            }
        });

        /* Auto-close on nav-link click */
        bindNavLinks(sidebar, overlay);

        /* On resize: reset if going back to desktop */
        window.addEventListener('resize', function () {
            if (!isMobile()) {
                closeSidebar(sidebar, overlay);
                document.body.style.overflow = '';
            }
        });

        /* ESC key closes sidebar */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isMobile()) {
                closeSidebar(sidebar, overlay);
            }
        });
    }

    /* Run after DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
