import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import Appwrapper from './Appwrapper';
import reportWebVitals from './reportWebVitals';

const rootElement = document.getElementById('root') as HTMLElement;
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Router>
      <Appwrapper />
    </Router>
  </React.StrictMode>
);

reportWebVitals();
