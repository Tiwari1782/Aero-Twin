import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0D1B2A',
            color: '#e2e8f0',
            border: '1px solid #1E3A5F',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#00FF88', secondary: '#0D1B2A' },
            style: { borderColor: '#00FF88' },
          },
          error: {
            iconTheme: { primary: '#FF3B3B', secondary: '#0D1B2A' },
            style: { borderColor: '#FF3B3B' },
            duration: 6000,
          },
        }}
      />
      {/* scanline overlay removed — was causing visible grid artifact */}
    </BrowserRouter>
  </React.StrictMode>
);
