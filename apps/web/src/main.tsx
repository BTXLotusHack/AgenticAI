import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles.css';
import './styles/product-tokens.css';
import './styles/product-shell.css';
import './styles/product-pages.css';
import './product.css';

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Loopin could not find the application root.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
