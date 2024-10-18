import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles.css';
import AppWrapper from './Appwrapper'; // Adjusted casing for the current project
import reportWebVitals from './reportWebVitals'; // Assuming this is still relevant

// Ensure TypeScript knows this element is not null
const rootElement = document.getElementById('root') as HTMLElement;

// Create root and render the AppWrapper inside React.StrictMode
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

// Optionally keep this if you're tracking performance or remove it if not needed
reportWebVitals();
