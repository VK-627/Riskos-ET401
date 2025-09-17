import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext'; // ✅ import the AuthProvider


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* ✅ wrap the whole app with AuthProvider */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
  