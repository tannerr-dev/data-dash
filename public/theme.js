// Theme management module
export class ThemeManager {
    constructor() {
        this.themeToggle = null;
        this.body = document.body;
        this.currentTheme = null;
        this.chartUpdateCallback = null;

        this.init();
    }

    init() {
        this.themeToggle = document.getElementById('themeToggle');

        if (!this.themeToggle) {
            console.error('Theme toggle button not found');
            return;
        }

        // Check for saved theme preference or default to system preference
        this.currentTheme = localStorage.getItem('theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        // Apply the current theme
        this.applyTheme(this.currentTheme);

        // Add event listeners
        this.setupEventListeners();
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            this.body.setAttribute('data-theme', 'dark');
            this.themeToggle.textContent = '☀️';
        } else {
            this.body.removeAttribute('data-theme');
            this.themeToggle.textContent = '🌙';
        }
        this.currentTheme = theme;
    }
    
    toggleTheme() {
        const isDark = this.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Trigger chart color update if callback is set
        if (this.chartUpdateCallback) {
            setTimeout(this.chartUpdateCallback, 100);
        }
    }
    
    setupEventListeners() {
        // Theme toggle button click
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only respond to system changes if no manual preference is set
            if (!localStorage.getItem('theme')) {
                const systemTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(systemTheme);
                
                // Trigger chart color update if callback is set
                if (this.chartUpdateCallback) {
                    setTimeout(this.chartUpdateCallback, 100);
                }
            }
        });
    }
    
    // Helper function to get CSS variable values (uses global function)
    getCSSVariable(variableName) {
        return window.getCSSVariable ? window.getCSSVariable(variableName) : 
               getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    
    // Set callback function for chart updates
    setChartUpdateCallback(callback) {
        this.chartUpdateCallback = callback;
    }
    
    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Check if current theme is dark
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }
}

// Export a singleton instance
export const themeManager = new ThemeManager();

// Also export the class for direct instantiation if needed
export default ThemeManager;
