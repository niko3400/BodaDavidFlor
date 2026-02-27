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

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5oieitm0JGxGHhEIt3t3IPwJPOfeOuyaPxseAYkPnP_fOZTvU_g44eoJOkgcxZ5vY/exec';

function Upload({ onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      progress: 0,
      status: 'pending', // pending, uploading, success, error
      type: file.type.includes('video') ? 'video' : 'image',
      size: file.size
    }));

    if (newFiles.some(f => f.size > 200 * 1024 * 1024)) {
      setMessage('Aviso: Archivos de más de 200MB pueden tardar bastante según tu conexión.');
    } else {
      setMessage('');
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const uploadFileResumable = async (fileObj) => {
    return new Promise(async (resolve, reject) => {
      try {
        updateFileStatus(fileObj.id, { status: 'preparing', progress: 0 });

        // 1. Obtener URL resiliente de Apps Script
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'getResumableUrl',
            filename: fileObj.name,
            type: fileObj.file.type
          })
        });

        const { location } = await response.json();
        if (!location) throw new Error('No se pudo obtener la URL de subida');

        // 2. Subir directamente a Google Drive vía PUT
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', location, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateFileStatus(fileObj.id, { progress: percent, status: 'uploading' });
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            updateFileStatus(fileObj.id, { progress: 100, status: 'success' });
            // Generar una URL local para la vista previa rápida
            const localUrl = URL.createObjectURL(fileObj.file);
            onUploadSuccess({
              id: Date.now() + Math.random(),
              url: localUrl,
              type: fileObj.type
            });
            resolve();
          } else {
            console.error('Upload failed with status:', xhr.status);
            updateFileStatus(fileObj.id, { status: 'error' });
            reject(new Error('Fallo en la subida a Drive'));
          }
        };

        xhr.onerror = () => {
          updateFileStatus(fileObj.id, { status: 'error' });
          reject(new Error('Error de red'));
        };

        xhr.send(fileObj.file);
      } catch (err) {
        console.error(err);
        updateFileStatus(fileObj.id, { status: 'error' });
        reject(err);
      }
    });
  };

  const updateFileStatus = (id, updates) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const startUploads = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Elegí archivos primero.');
      return;
    }

    setIsUploading(true);
    setMessage('Subiendo... No cierres esta pestaña.');

    for (const fileObj of selectedFiles) {
      if (fileObj.status === 'pending' || fileObj.status === 'error') {
        try {
          await uploadFileResumable(fileObj);
        } catch (error) {
          console.error('Error en cola:', error);
          // Continuamos con el siguiente a pesar del error
        }
      }
    }

    setIsUploading(false);
    const hasErrors = selectedFiles.some(f => f.status === 'error');
    if (!hasErrors) {
      setMessage('¡Todo subido con éxito!');
      setTimeout(() => setSelectedFiles([]), 5000);
    } else {
      setMessage('Algunos archivos fallaron. Podés reintentar.');
    }
  };

  const removeFile = (id) => {
    if (isUploading) return;
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hero"
    >
      <h1>Nuestra Boda</h1>
      <p>Subí tus fotos y videos (sin límite de tamaño)</p>

      <div className="upload-container glass">
        <div className="upload-zone" onClick={() => !isUploading && document.getElementById('photo-input').click()}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#D4AF37' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ marginTop: '1rem' }}>Toca para elegir de tu galería</p>
          </motion.div>
          <input
            type="file"
            id="photo-input"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="file-list">
            <AnimatePresence>
              {selectedFiles.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="file-item"
                >
                  <div className="file-info">
                    <span className="file-name">{f.name}</span>
                    <span className={`file-status ${f.status}`}>
                      {f.status === 'success' ? '✓' : f.status === 'error' ? '!' : `${f.progress}%`}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <motion.div
                      className={`progress-bar-fill ${f.status}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {!isUploading && (f.status === 'pending' || f.status === 'error') && (
                    <button className="remove-btn" onClick={() => removeFile(f.id)}>×</button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <button
          className="upload-btn"
          onClick={startUploads}
          disabled={isUploading || selectedFiles.length === 0}
        >
          {isUploading ? 'Subiendo archivos...' : selectedFiles.length > 0 ? `Subir ${selectedFiles.length} archivos` : 'Esperando archivos'}
        </button>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="upload-message"
              style={{ color: message.includes('fallaron') || message.includes('Aviso') ? '#e74c3c' : '#27ae60' }}
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
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
      <h1>Galería de Fotos y Videos</h1>
      <p>Todos los momentos compartidos</p>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Buscando recuerdos...</p>
        </div>
      ) : (
        <div className="carousel-container glass">
          {items.length > 0 ? (
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
              {items.map(item => (
                <SwiperSlide key={item.id}>
                  <div className="slide-content">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        playsInline
                        className="slide-video"
                      />
                    ) : (
                      <img src={item.url} alt={item.name} />
                    )}
                    <div className="slide-overlay glass">
                      <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Descargar original
                      </a>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="empty-gallery">Aún no hay recuerdos en la galería. ¡Sé el primero en subir uno!</p>
          )}
        </div>
      )}
    </motion.section>
  );
}

function App() {
  const [recentItems, setRecentItems] = useState([]);

  const handleUploadSuccess = (item) => {
    setRecentItems(prev => [item, ...prev].slice(0, 3));
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
                {recentItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="recent-uploads"
                  >
                    <h2>Recién subidos</h2>
                    <div className="thumbnails-grid">
                      {recentItems.map(item => (
                        <div key={item.id} className="thumbnail-container">
                          {item.type === 'video' ? (
                            <div className="video-thumb">
                              <video src={item.url} muted />
                              <div className="play-icon">▶</div>
                            </div>
                          ) : (
                            <img src={item.url} alt="Recién subido" />
                          )}
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
