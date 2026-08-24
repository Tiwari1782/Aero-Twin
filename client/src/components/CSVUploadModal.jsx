import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiCheckCircle, FiXCircle, FiX, FiDatabase } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:5000';

const C = {
  blue:   '#00C2FF',
  green:  '#00FF88',
  amber:  '#FBBF24',
  red:    '#FF453A',
  text:   '#C8DFF0',
  muted:  '#4A7A9B',
  border: 'rgba(0,194,255,0.12)',
};

export default function CSVUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null); // { success: bool, data/error }
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setResult(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const validateFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Only .csv files are accepted';
    }
    if (file.size > 50 * 1024 * 1024) {
      return 'File size exceeds 50 MB limit';
    }
    return null;
  };

  const handleFileSelect = (file) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_URL}/api/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setUploadProgress(pct);
        },
      });

      setResult({ success: true, data: response.data });
      toast.success(
        `Dataset loaded — ${response.data.total_rows.toLocaleString()} rows ready`,
        { id: 'csv-upload-success', duration: 5000 }
      );

      if (onUploadSuccess) onUploadSuccess(response.data);

      // Auto-close after 2.5s
      setTimeout(() => handleClose(), 2500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      setResult({ success: false, error: msg, details: err.response?.data });
      toast.error(msg, { id: 'csv-upload-error' });
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(10,28,53,0.98) 0%, rgba(6,15,30,0.99) 100%)',
              border: '1px solid rgba(0,194,255,0.2)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,194,255,0.1)',
            }}
          >
            {/* Top glow line */}
            <div
              className="absolute inset-x-0 top-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.5), transparent)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,194,255,0.15) 0%, rgba(0,194,255,0.05) 100%)',
                    border: '1px solid rgba(0,194,255,0.25)',
                  }}
                >
                  <FiUploadCloud style={{ color: C.blue, fontSize: 18 }} />
                </div>
                <div>
                  <h3
                    className="text-sm font-black tracking-tight"
                    style={{ color: '#E8F4FF', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Upload CSV Dataset
                  </h3>
                  <p style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>
                    C-MAPSS format • engine_id, cycle, s1…s21
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: C.muted,
                }}
              >
                <FiX size={16} />
              </motion.button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {/* Drop zone */}
              {!result?.success && (
                <motion.div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  animate={{
                    borderColor: dragOver ? C.blue : 'rgba(0,194,255,0.15)',
                    background: dragOver
                      ? 'rgba(0,194,255,0.06)'
                      : 'rgba(255,255,255,0.02)',
                  }}
                  className="relative rounded-xl cursor-pointer transition-all duration-300 group"
                  style={{
                    border: '2px dashed rgba(0,194,255,0.15)',
                    padding: '32px 24px',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleInputChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center gap-3 text-center">
                    <motion.div
                      animate={{
                        y: dragOver ? -4 : 0,
                        scale: dragOver ? 1.1 : 1,
                      }}
                      transition={{ type: 'spring', bounce: 0.4 }}
                    >
                      <FiUploadCloud
                        style={{
                          fontSize: 36,
                          color: dragOver ? C.blue : C.muted,
                          transition: 'color 0.2s',
                        }}
                      />
                    </motion.div>

                    <div>
                      <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                        {dragOver ? 'Drop your CSV here' : 'Drag & drop CSV file here'}
                      </p>
                      <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                        or{' '}
                        <span
                          style={{ color: C.blue, textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          browse files
                        </span>{' '}
                        • Max 50 MB
                      </p>
                    </div>
                  </div>

                  {/* Animated corner accents when dragging */}
                  {dragOver && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-2 left-2 w-4 h-4"
                        style={{
                          borderTop: `2px solid ${C.blue}`,
                          borderLeft: `2px solid ${C.blue}`,
                          borderRadius: '4px 0 0 0',
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-2 right-2 w-4 h-4"
                        style={{
                          borderTop: `2px solid ${C.blue}`,
                          borderRight: `2px solid ${C.blue}`,
                          borderRadius: '0 4px 0 0',
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute bottom-2 left-2 w-4 h-4"
                        style={{
                          borderBottom: `2px solid ${C.blue}`,
                          borderLeft: `2px solid ${C.blue}`,
                          borderRadius: '0 0 0 4px',
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute bottom-2 right-2 w-4 h-4"
                        style={{
                          borderBottom: `2px solid ${C.blue}`,
                          borderRight: `2px solid ${C.blue}`,
                          borderRadius: '0 0 4px 0',
                        }}
                      />
                    </>
                  )}
                </motion.div>
              )}

              {/* Selected file info */}
              {selectedFile && !result?.success && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: 'rgba(0,194,255,0.06)',
                    border: '1px solid rgba(0,194,255,0.15)',
                  }}
                >
                  <FiFile style={{ color: C.blue, fontSize: 18, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{ color: C.text, fontSize: 12, fontWeight: 600 }}
                    >
                      {selectedFile.name}
                    </p>
                    <p style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>
                      {formatSize(selectedFile.size)}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{ color: C.muted }}
                  >
                    <FiX size={14} />
                  </motion.button>
                </motion.div>
              )}

              {/* Upload progress bar */}
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: C.muted, fontSize: 10, fontWeight: 600 }}>
                      Uploading & validating…
                    </span>
                    <span style={{ color: C.blue, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(0,194,255,0.1)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #0066CC, #00C2FF, #00FF88)',
                        backgroundSize: '200% 100%',
                      }}
                      initial={{ width: '0%' }}
                      animate={{
                        width: `${uploadProgress}%`,
                        backgroundPosition: ['0% 0%', '100% 0%'],
                      }}
                      transition={{
                        width: { duration: 0.3 },
                        backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Success state */}
              {result?.success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  >
                    <FiCheckCircle style={{ fontSize: 48, color: C.green }} />
                  </motion.div>
                  <div className="text-center">
                    <p style={{ color: C.green, fontSize: 14, fontWeight: 800 }}>
                      Dataset Loaded Successfully
                    </p>
                    <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                      {result.data.total_rows?.toLocaleString()} rows •{' '}
                      {result.data.columns?.length} columns • CSV Replay active
                    </p>
                  </div>

                  {/* Dataset info chips */}
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{
                        background: 'rgba(0,255,136,0.08)',
                        border: '1px solid rgba(0,255,136,0.2)',
                      }}
                    >
                      <FiDatabase style={{ color: C.green, fontSize: 11 }} />
                      <span style={{ color: C.green, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                        {result.data.filename}
                      </span>
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-lg"
                      style={{
                        background: 'rgba(0,194,255,0.08)',
                        border: '1px solid rgba(0,194,255,0.2)',
                      }}
                    >
                      <span style={{ color: C.blue, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                        MODE: CSV
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {result && !result.success && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 px-4 py-3 rounded-xl"
                  style={{
                    background: 'rgba(255,69,58,0.08)',
                    border: '1px solid rgba(255,69,58,0.25)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <FiXCircle style={{ color: C.red, fontSize: 16, marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <p style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>
                        {result.error}
                      </p>
                      {result.details?.hint && (
                        <p style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
                          {result.details.hint}
                        </p>
                      )}
                      {result.details?.found_columns && (
                        <p style={{ color: C.muted, fontSize: 9, marginTop: 4, fontFamily: 'monospace' }}>
                          Found: {result.details.found_columns.slice(0, 8).join(', ')}
                          {result.details.found_columns.length > 8 && '\u2026'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {!result?.success && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <p style={{ color: C.muted, fontSize: 9, letterSpacing: '0.05em' }}>
                  Supports NASA C-MAPSS dataset format
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{
                      color: C.muted,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{
                      scale: 1.03,
                      boxShadow: '0 0 24px rgba(0,194,255,0.3)',
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    style={{
                      background: selectedFile && !uploading
                        ? 'linear-gradient(135deg, #0066CC 0%, #00AAFF 100%)'
                        : 'rgba(255,255,255,0.06)',
                      color: selectedFile && !uploading ? '#fff' : C.muted,
                      border: '1px solid rgba(0,194,255,0.3)',
                      cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                      opacity: !selectedFile || uploading ? 0.5 : 1,
                    }}
                  >
                    <FiUploadCloud size={14} />
                    {uploading ? 'Uploading\u2026' : 'Upload & Activate'}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
