import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './index.css';

// Apply initial theme
import { themes } from './themes/themes';
import { applyTheme } from './themes/css-vars';
const saved = localStorage.getItem('planner-theme');
const themeName = saved ? JSON.parse(saved)?.state?.themeName : 'neon';
applyTheme((themes[themeName] ?? themes.neon).colors);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
