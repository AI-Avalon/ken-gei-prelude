import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DeviceContext, useIsMobileInternal } from './hooks/useDevice';
import './index.css';

function Root() {
  const isMobile = useIsMobileInternal();
  return (
    <DeviceContext.Provider value={isMobile}>
      <App />
    </DeviceContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
