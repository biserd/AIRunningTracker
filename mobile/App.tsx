import React from 'react';

// Simple React web version for mobile app
export default function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ color: '#007AFF', marginBottom: '20px' }}>
          RunAnalytics Mobile
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          AI-Powered Running Analytics
        </p>
        <div style={{
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <p>Connected to RunAnalytics platform</p>
          <p style={{ fontSize: '14px', color: '#888' }}>
            Backend: http://localhost:5000
          </p>
        </div>
      </div>
    </div>
  );
}
