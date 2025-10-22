// src/App.jsx
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import PDFViewer from './components/PDFViewer';
import { getCurrentUser, isBackendAvailable } from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentPDF, setCurrentPDF] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check backend status and auto-login
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if backend is available
        const backendAvailable = await isBackendAvailable();
        setBackendStatus(backendAvailable ? 'online' : 'offline');
        
        if (backendAvailable) {
          // Try to get current user from backend
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const userData = await getCurrentUser();
              setUser(userData.user || userData); // Handle both response formats
            }
          } catch (error) {
            console.log('No valid token or backend error:', error);
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('pdfAnnotatorUser');
          }
        } else {
          // Fallback to localStorage for user data
          const savedUser = localStorage.getItem('pdfAnnotatorUser');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (error) {
              console.error('Error parsing saved user:', error);
              localStorage.removeItem('pdfAnnotatorUser');
            }
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
        setBackendStatus('offline');
        
        // Fallback to localStorage
        const savedUser = localStorage.getItem('pdfAnnotatorUser');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('pdfAnnotatorUser');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (userData, token = null) => {
    setUser(userData);
    
    // Save to localStorage as fallback
    localStorage.setItem('pdfAnnotatorUser', JSON.stringify(userData));
    
    // Save token if provided (from backend login)
    if (token) {
      localStorage.setItem('token', token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPDF(null);
    localStorage.removeItem('token');
    localStorage.removeItem('pdfAnnotatorUser');
  };

  const handleBackFromPDF = () => {
    setCurrentPDF(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading PDF Annotator...</p>
        <small>Checking backend connection...</small>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Backend Status Indicator */}
      {backendStatus === 'offline' && (
        <div className="backend-offline-warning">
          <div className="warning-content">
            <span>⚠️ Backend is offline. Using local storage mode.</span>
            <small>Some features may be limited.</small>
          </div>
        </div>
      )}

      {!user ? (
        <Auth 
          onLogin={handleLogin} 
          backendStatus={backendStatus} 
        />
      ) : currentPDF ? (
        <PDFViewer 
          pdf={currentPDF} 
          user={user}
          onBack={handleBackFromPDF}
          backendStatus={backendStatus}
        />
      ) : (
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          onPDFSelect={setCurrentPDF}
          backendStatus={backendStatus}
        />
      )}
    </div>
  );
}

export default App;