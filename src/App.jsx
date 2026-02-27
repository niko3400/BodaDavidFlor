import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination, Keyboard } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import './App.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1kz99Xl2xz_z7Yc_2EEnP8BQENe5koKpP80tdWGUUZkO0FYeK9p3BnMZ-irJ0c8dt/exec';

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

        onUploadSuccess({
          id: Date.now(),
          url: reader.result
        });

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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hero"
    >
      <h1>Nuestra Boda</h1>
      <p>Compartí la magia de este día con nosotros</p>

      <div className="upload-zone glass" onClick={() => document.getElementById('photo-input').click()}>
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

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: '1rem',
                color: message.includes('error') ? '#e74c3c' : '#27ae60',
                fontSize: '0.9rem'
              }}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
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
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="gallery-section hero"
    >
      <h1>Galería de Fotos</h1>
      <p>Todos los momentos compartidos</p>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Buscando recuerdos...</p>
        </div>
      ) : (
        <div className="carousel-container glass">
          {photos.length > 0 ? (
            <Swiper
              effect={'coverflow'}
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={'auto'}
              coverflowEffect={{
                rotate: 50,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: true,
              }}
              pagination={{ clickable: true }}
              navigation={true}
              keyboard={true}
              modules={[EffectCoverflow, Pagination, Navigation, Keyboard]}
              className="mySwiper"
            >
              {photos.map(photo => (
                <SwiperSlide key={photo.id}>
                  <div className="slide-content">
                    <img src={photo.url} alt={photo.name} />
                    <div className="slide-overlay glass">
                      <a href={photo.downloadUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Descargar alta resolución
                      </a>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="empty-gallery">Aún no hay fotos en la galería. ¡Sé el primero en subir una!</p>
          )}
        </div>
      )}
    </motion.section>
  );
}

function App() {
  const [recentPhotos, setRecentPhotos] = useState([]);

  const handleUploadSuccess = (photo) => {
    setRecentPhotos(prev => [photo, ...prev].slice(0, 3));
  };

  return (
    <Router>
      <nav className="navbar glass">
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
              <AnimatePresence>
                {recentPhotos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="recent-uploads"
                  >
                    <h2>Recién subidas</h2>
                    <div className="thumbnails-grid">
                      {recentPhotos.map(photo => (
                        <div key={photo.id} className="thumbnail-container">
                          <img src={photo.url} alt="Recién subida" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          } />
          <Route path="/galeria" element={<Gallery />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
