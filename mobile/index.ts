import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Web-based mobile app entry point
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(React.createElement(App));
