/**
 * FlowTest Theme Initialization
 * This script ensures the correct theme is applied immediately when page loads
 */

// Get stored theme or use system preference as fallback
const storedTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const currentTheme = storedTheme || systemTheme;

// Apply theme immediately to prevent flash of wrong theme
if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}