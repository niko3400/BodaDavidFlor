import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination, Keyboard, Autoplay } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import SnakeGame from './components/SnakeGame';
import FlappyGame from './components/FlappyGame';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import './App.css';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypkop9VIYGtMh8e_H89QrDwyHVKBiddy5KycB0dXUUtqzT1-CcoGBz2ZmIlgVu23Hk/exec';

// Helper para evitar CORS usando JSONP (usado solo para listar galer├¡a)
const fetchJSONP = (url) => {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    script.src = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}callback=${callbackName}`;

    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('Error de conexi├│n con el servidor (CORS/Network)'));
    };

    document.body.appendChild(script);

    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
        reject(new Error('Tiempo de espera agotado'));
      }
    }, 30000);
  });
};

// Helper para leer archivo como base64
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper para obtener URL resumable via fetch
const getResumableUrl = async (filename, mimeType) => {
  const url = `${SCRIPT_URL}?action=getResumableUrl&filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(mimeType)}`;

  try {
    const resp = await fetch(url, { redirect: 'follow' });
    const data = await resp.json();
    if (data.location) return data.location;
  } catch (e) {
    console.log('Fetch directo fall├│, intentando v├¡a JSONP...', e);
  }

  const data = await fetchJSONP(url);
  if (data && data.location) return data.location;

  throw new Error('No se pudo obtener la URL de subida');
};

// Genera una "huella" ├║nica del archivo basada en metadata
const getFileFingerprint = (file) => {
  return `${file.name}|${file.size}|${file.lastModified}|${file.type}`;
};

// Genera nombre de archivo con prefijo del uploader
const buildUploadName = (uploaderName, originalName) => {
  const clean = uploaderName.trim().replace(/\s+/g, '_');
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  const rand = Math.random().toString(36).substr(2, 4);
  return `${clean}_${ts}_${rand}${ext}`;
};

function Upload({ onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeGame, setActiveGame] = useState(null);
  const [uploaderName, setUploaderName] = useState('');
  const [uploadedFingerprints, setUploadedFingerprints] = useState(new Set());

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Detectar duplicados por metadata
    const existingFingerprints = new Set([
      ...uploadedFingerprints,
      ...selectedFiles.map(f => getFileFingerprint(f.file))
    ]);

    let duplicateCount = 0;
    const newFiles = [];

    files.forEach(file => {
      const fp = getFileFingerprint(file);
      if (existingFingerprints.has(fp)) {
        duplicateCount++;
      } else {
        existingFingerprints.add(fp);
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          progress: 0,
          status: 'pending',
          type: file.type.includes('video') ? 'video' : 'image',
          size: file.size
        });
      }
    });

    if (duplicateCount > 0) {
      setMessage(`${duplicateCount} archivo(s) duplicado(s) omitido(s)`);
    } else {
      setMessage('');
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const uploadFileBase64 = async (fileObj) => {
    try {
      updateFileStatus(fileObj.id, { status: 'preparing', progress: 10 });

      const base64Data = await readFileAsBase64(fileObj.file);
      updateFileStatus(fileObj.id, { progress: 30, status: 'uploading' });

      const uploadName = buildUploadName(uploaderName, fileObj.name);
      const payload = JSON.stringify({
        filename: uploadName,
        type: fileObj.file.type,
        file: base64Data
      });

      updateFileStatus(fileObj.id, { progress: 50 });

      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });

      updateFileStatus(fileObj.id, { progress: 100, status: 'success' });
      setUploadedFingerprints(prev => new Set([...prev, getFileFingerprint(fileObj.file)]));
      const localUrl = URL.createObjectURL(fileObj.file);
      onUploadSuccess({
        id: Date.now() + Math.random(),
        url: localUrl,
        type: fileObj.type
      });
    } catch (err) {
      console.error('Error subida base64:', err);
      updateFileStatus(fileObj.id, { status: 'error' });
      throw err;
    }
  };

  const uploadFileResumable = async (fileObj) => {
    try {
      updateFileStatus(fileObj.id, { status: 'preparing', progress: 0 });

      const uploadName = buildUploadName(uploaderName, fileObj.name);
      const location = await getResumableUrl(uploadName, fileObj.file.type);

      return new Promise((resolve, reject) => {
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
            setUploadedFingerprints(prev => new Set([...prev, getFileFingerprint(fileObj.file)]));
            const localUrl = URL.createObjectURL(fileObj.file);
            onUploadSuccess({
              id: Date.now() + Math.random(),
              url: localUrl,
              type: fileObj.type
            });
            resolve();
          } else {
            updateFileStatus(fileObj.id, { status: 'error' });
            reject(new Error('Fallo en la subida'));
          }
        };

        xhr.onerror = () => {
          updateFileStatus(fileObj.id, { status: 'error' });
          reject(new Error('Error de red'));
        };

        xhr.send(fileObj.file);
      });
    } catch (err) {
      console.error(err);
      updateFileStatus(fileObj.id, { status: 'error' });
      throw err;
    }
  };

  const uploadFile = async (fileObj) => {
    const TEN_MB = 10 * 1024 * 1024;
    if (fileObj.size < TEN_MB) {
      return uploadFileBase64(fileObj);
    } else {
      return uploadFileResumable(fileObj);
    }
  };

  const updateFileStatus = (id, updates) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const startUploads = async () => {
    if (isUploading) return;
    setIsUploading(true);
    setMessage('Subiendo recuerdos... ┬íJug├í mientras esper├ís! ­ƒÄ«');

    for (const fileObj of selectedFiles) {
      if (fileObj.status === 'pending' || fileObj.status === 'error') {
        try {
          await uploadFile(fileObj);
        } catch (error) {
          console.error('Error en subida:', error);
        }
      }
    }

    setIsUploading(false);
    const hasErrors = selectedFiles.some(f => f.status === 'error');
    if (!hasErrors) {
      setMessage('┬íTodo subido con ├®xito! ­ƒÄë');
      setActiveGame(null);
      setTimeout(() => setSelectedFiles([]), 5000);
    } else {
      setMessage('Algunos archivos fallaron. Reintent├í.');
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
      <h1>Nuestro Civil</h1>
      <p>Compart├¡ tus fotos y videos</p>

      <div className="upload-container glass">
        {/* Nombre obligatorio */}
        <div className="name-input-group">
          <label htmlFor="uploader-name" className="name-label">Tu nombre</label>
          <input
            type="text"
            id="uploader-name"
            className="name-input"
            placeholder="Ej: Mar├¡a L├│pez"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            disabled={isUploading}
            maxLength={40}
            autoComplete="name"
          />
          {!uploaderName.trim() && selectedFiles.length > 0 && (
            <p className="name-warning">ÔÜá Ingres├í tu nombre para poder subir</p>
          )}
        </div>

        <div className="upload-zone" onClick={() => !isUploading && document.getElementById('photo-input').click()}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7c5e' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ marginTop: '1rem' }}>Toca para elegir de tu galer├¡a</p>
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
                      {f.status === 'success' ? 'Ô£ô' : f.status === 'error' ? '!' : `${f.progress}%`}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <motion.div
                      className={`progress-bar-fill ${f.status}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.progress}%` }}
                    />
                  </div>
                  {!isUploading && (f.status === 'pending' || f.status === 'error') && (
                    <button className="remove-btn" onClick={() => removeFile(f.id)}>├ù</button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <button
            className="upload-btn"
            onClick={startUploads}
            disabled={isUploading || !uploaderName.trim()}
          >
            {isUploading ? 'Subiendo...' : !uploaderName.trim() ? 'Ingres├í tu nombre primero' : `Subir ${selectedFiles.length} archivos`}
          </button>
        )}

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="upload-message"
              style={{ color: message.includes('fallaron') ? '#b94a48' : '#6b7c5e' }}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Mini-games section - visible during upload */}
        {isUploading && !activeGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="games-picker"
          >
            <p className="games-title">­ƒÄ« ┬íJug├í mientras esper├ís!</p>
            <div className="games-grid">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="game-pick-btn snake-btn"
                onClick={() => setActiveGame('snake')}
              >
                <span className="game-pick-emoji">­ƒÉì</span>
                <span className="game-pick-name">Culebrita Nupcial</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="game-pick-btn flappy-btn"
                onClick={() => setActiveGame('flappy')}
              >
                <span className="game-pick-emoji">­ƒòè´©Å</span>
                <span className="game-pick-name">Paloma Voladora</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {activeGame === 'snake' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <SnakeGame onClose={() => setActiveGame(null)} />
            </motion.div>
          )}
          {activeGame === 'flappy' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <FlappyGame onClose={() => setActiveGame(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await fetchJSONP(SCRIPT_URL);
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="gallery-section"
    >
      <div className="gallery-header">
        <h1>Galer├¡a de Recuerdos</h1>
        <p>Todos los momentos compartidos</p>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Buscando recuerdos...</p>
        </div>
      ) : (
        <>
          <div className="carousel-container glass">
            {items.length > 0 ? (
              <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={'auto'}
                loop={items.length > 3}
                autoplay={{
                  delay: 3500,
                  disableOnInteraction: true,
                  pauseOnMouseEnter: true,
                }}
                coverflowEffect={{
                  rotate: 30,
                  stretch: 0,
                  depth: 120,
                  modifier: 1,
                  slideShadows: true,
                }}
                pagination={{ clickable: true, dynamicBullets: true }}
                navigation={true}
                keyboard={{ enabled: true }}
                modules={[EffectCoverflow, Pagination, Navigation, Keyboard, Autoplay]}
                className="mySwiper"
              >
                {items.map(item => (
                  <SwiperSlide key={item.id}>
                    <div className="slide-content" onClick={() => setSelectedItem(item)}>
                      {item.type === 'video' ? (
                        <video src={item.url} playsInline muted className="slide-media" />
                      ) : (
                        <img src={item.url} alt={item.name} className="slide-media" loading="lazy" />
                      )}
                      <div className="slide-overlay">
                        {item.type === 'video' && <div className="play-badge">ÔûÂ</div>}
                        <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="download-link"
                          onClick={(e) => e.stopPropagation()}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Descargar
                        </a>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="empty-gallery">
                <span className="empty-emoji">­ƒôÀ</span>
                <p>A├║n no hay recuerdos. ┬íS├® el primero en subir uno!</p>
              </div>
            )}
          </div>

          {/* Lightbox */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                className="lightbox-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
              >
                <motion.div
                  className="lightbox-content"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="lightbox-close" onClick={() => setSelectedItem(null)}>Ô£ò</button>
                  {selectedItem.type === 'video' ? (
                    <video src={selectedItem.url} controls playsInline autoPlay className="lightbox-media" />
                  ) : (
                    <img src={selectedItem.url} alt={selectedItem.name} className="lightbox-media" />
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
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
    <Router future={{ v7_relativeSplatPath: true }}>
      <nav className="navbar glass">
        <Link to="/" className="navbar-brand">Flor & <span className="brand-initial">D</span>avid</Link>
        <div className="nav-links">
          <Link to="/" className="nav-link">Subir</Link>
          <Link to="/galeria" className="nav-link">Galer├¡a</Link>
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
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="recent-uploads"
                  >
                    <h2>Reci├®n subidos</h2>
                    <div className="thumbnails-grid">
                      {recentItems.map(item => (
                        <div key={item.id} className="thumbnail-container">
                          {item.type === 'video' ? (
                            <div className="video-thumb">
                              <video src={item.url} muted /><div className="play-icon">ÔûÂ</div>
                            </div>
                          ) : (
                            <img src={item.url} alt="Reci├®n subido" />
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
