/**
 * Client-side JavaScript for the Employee Attendance System
 * Handles tab switching, form submissions, and data loading
 *
 * This version is updated for Electron, using ipcRenderer to communicate
 * with the main process for database operations, and custom modals
 * instead of native alert/confirm dialogs. It also includes
 * dark/light mode toggle functionality.
 */





document.addEventListener('DOMContentLoaded', function() {

    // --- Custom Message Box Implementation (Replaces alert() and confirm()) ---
    // In Electron, native alert/confirm dialogs are blocking and can be jarring.
    // This provides a basic in-app modal for messages and confirmations.


    const body = document.body;

     // --- Custom Title Bar Controls ---
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    // --- End Custom Title Bar Controls ---

    // --- Sidebar Functionality ---
    const appIconBtn = document.getElementById('app-icon-btn');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const bodyElement = document.body; // Reference to the body for sidebar-open class

    function showSidebar() {
        sidebarMenu.classList.add('active');
        sidebarOverlay.classList.add('active');
        bodyElement.classList.add('sidebar-open'); // Add class to body to adjust container margin
    }

    function hideSidebar() {
        sidebarMenu.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        bodyElement.classList.remove('sidebar-open'); // Remove class from body
    }

    if (appIconBtn) {
        appIconBtn.addEventListener('click', showSidebar);
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', hideSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', hideSidebar); // Close sidebar when clicking overlay
    }

    // Sidebar navigation handling
    const sidebarNavLinks = document.querySelectorAll('#sidebar-menu .sidebar-nav a');

    sidebarNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior

            const pageTarget = this.getAttribute('data-page-target');
            const tabTarget = this.getAttribute('data-tab-target');

            if (pageTarget) {
                // If it's a page navigation link
                window.electronAPI.navigateTo(pageTarget);
                hideSidebar(); // Hide sidebar after navigation
            } else if (tabTarget) {
                // If it's a tab switching link (within index.html)
                const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabTarget}"]`);
                if (tabBtn) {
                    tabBtn.click(); // Simulate a click on the corresponding tab button
                    hideSidebar(); // Hide sidebar after tab switch
                }
            }
        });
    });



    // --- Dark Mode Toggle Functionality ---
    const themeToggleBtn = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // Function to toggle the theme and save preference
    function toggleTheme() {
        if (document.body.classList.contains('dark-mode')) {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
        } else {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    // Load theme preference on startup
    // Checks localStorage first, otherwise defaults to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Add event listener for the theme toggle button
    if (themeToggleBtn) { // Ensure the button exists before adding listener
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    // --- End Dark Mode Toggle Functionality ---



});
