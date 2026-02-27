import React, { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentPhotos, setRecentPhotos] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Por favor, seleccioná una foto primero.');
      return;
    }

    setUploading(true);
    setMessage('Subiendo foto...');

    // Placeholder for actual upload logic
    // We will use FileReader to convert files to base64 for Google Apps Script
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        // Logic to upload to Google Apps Script bridge

        const response = await fetch('https://script.google.com/macros/s/AKfycbyZQQ8tnJLrmA_jy4EY4so1Arfr_qe0JIvjP7AHaHSq2dVn5ABrdka5jEajWSKzoKCh/exec', {
          method: 'POST',
          mode: 'no-cors', // Apps Script requires no-cors if not using specialized headers
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({
            file: base64Data,
            filename: file.name,
            type: file.type
          })
        });

        // Add to local recent photos for preview
        const newPhoto = {
          id: Date.now(),
          url: reader.result // We use the local base64 for immediate feedback
        };

        setRecentPhotos(prev => [newPhoto, ...prev].slice(0, 9)); // Keep last 9
        setUploading(false);
        setFile(null);
        setMessage('¡Foto subida con éxito! Gracias por compartir.');
      };
    } catch (error) {
      console.error(error);
      setUploading(false);
      setMessage('Hubo un error al subir la foto. Reintentá.');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">David & Flor</div>
      </nav>

      <main className="app-container">
        <section className="hero">
          <h1>Nuestra Boda</h1>
          <p>Compartí la magia de este día con nosotros</p>

          <div className="upload-zone" onClick={() => document.getElementById('photo-input').click()}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#D4AF37' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>

            <input
              type="file"
              id="photo-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {file ? (
              <p style={{ fontWeight: 'bold', color: '#D4AF37' }}>{file.name}</p>
            ) : (
              <p>Sacá una foto o elegí una de tu galería</p>
            )}

            <button
              className="upload-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : 'Subir Foto'}
            </button>

            {message && (
              <p style={{
                marginTop: '1rem',
                color: message.includes('error') ? '#e74c3c' : '#27ae60',
                fontSize: '0.9rem'
              }}>
                {message}
              </p>
            )}
          </div>

          {recentPhotos.length > 0 && (
            <div className="recent-uploads">
              <h2>Fotos compartidas</h2>
              <div className="thumbnails-grid">
                {recentPhotos.map(photo => (
                  <div key={photo.id} className="thumbnail-container">
                    <img src={photo.url} alt="Recién subida" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default App;
