import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SignPage } from './pages/SignPage.tsx';
import './index.css';

// Roteamento mínimo: /assinar/:id é uma página pública isolada do app principal
// (sem navbar, sem dados locais) — quem assina não tem acesso ao resto do sistema.
const isPublicSignRoute = /^\/assinar\/[^/]+/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublicSignRoute ? <SignPage /> : <App />}
  </StrictMode>,
);
