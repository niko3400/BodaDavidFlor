import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwC-tBZ4pGHVB6eHPO8PvAueb7rhLXVl2zjfnQMWrlLvWG-9YnYas-P073ldNtrJSLG/exec';

function Upload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

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

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            file: base64Data,
            filename: file.name,
            type: file.type
          })
        });

        onUploadSuccess(reader.result);
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
    </section>
  );
}

function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="gallery-section hero">
      <h1>Galería de Fotos</h1>
      <p>Todos los momentos compartidos</p>

      {loading ? (
        <p>Cargando galería...</p>
      ) : (
        <div className="thumbnails-grid full-gallery">
          {photos.map(photo => (
            <div key={photo.id} className="thumbnail-container">
              <img src={photo.thumbnail} alt={photo.name} loading="lazy" />
            </div>
          ))}
          {photos.length === 0 && <p>Aún no hay fotos en la galería. ¡Sé el primero en subir una!</p>}
        </div>
      )}
    </section>
  );
}

function App() {
  const [recentPhotos, setRecentPhotos] = useState([]);

  const handleUploadSuccess = (url) => {
    const newPhoto = {
      id: Date.now(),
      url: url
    };
    setRecentPhotos(prev => [newPhoto, ...prev].slice(0, 3));
  };

  return (
    <Router>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">David & Flor</Link>
        <div className="nav-links">
          <Link to="/" className="nav-link">Subir</Link>
          <Link to="/galeria" className="nav-link">Galería</Link>
        </div>
      </nav>

      <main className="app-container">
        <Routes>
          <Route path="/" element={
            <>
              <Upload onUploadSuccess={handleUploadSuccess} />
              {recentPhotos.length > 0 && (
                <div className="recent-uploads">
                  <h2>Recién subidas</h2>
                  <div className="thumbnails-grid">
                    {recentPhotos.map(photo => (
                      <div key={photo.id} className="thumbnail-container">
                        <img src={photo.url} alt="Recién subida" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          } />
          <Route path="/galeria" element={<Gallery />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
