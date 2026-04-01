import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1a1a2e',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '13px',
        },
        success: { style: { background: '#059669' } },
        error:   { style: { background: '#dc2626' } },
      }}
    />
  </React.StrictMode>
);
