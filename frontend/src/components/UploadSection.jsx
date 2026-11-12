import React, { useState, useRef } from 'react';
import { 
  IconUploadCloud, 
  IconFileText, 
  IconSparkles, 
  IconCheckCircle, 
  IconAlertTriangle, 
  IconRefreshCw, 
  IconZap 
} from './Icons';

export const UploadSection = ({ onAnalyzePdf, onAnalyzeText, isAnalyzing, error, clearError }) => {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [paperTitle, setPaperTitle] = useState('');
  const fileInputRef = useRef(null);

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (clearError) clearError();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (clearError) clearError();
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF file (.pdf).');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('File size exceeds the 30MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = () => {
    if (activeTab === 'pdf') {
      if (!selectedFile) return;
      onAnalyzePdf(selectedFile);
    } else {
      if (!pastedText.trim()) return;
      onAnalyzeText(pastedText, paperTitle);
    }
  };

  const handleLoadSampleText = () => {
    setPaperTitle('Attention Is All You Need (Vaswani et al.)');
    setPastedText(`Attention Is All You Need
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin

Abstract:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

1 Introduction:
Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling. Aligning positions to computational time steps creates an inherently sequential nature that precludes parallelization within training examples, becoming critical at longer sequence lengths. In this work we propose the Transformer, eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.`);
    setActiveTab('text');
  };

  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;

  return (
    <div className="upload-container">
      {/* Tab Switcher */}
      <div className="tab-pill-wrapper">
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdf')}
        >
          <IconFileText size={16} />
          <span>Upload PDF Document</span>
        </button>
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <IconFileText size={16} />
          <span>Paste Paper Abstract / Text</span>
        </button>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="error-alert">
          <IconAlertTriangle size={18} className="error-alert-icon" />
          <div className="error-alert-content">
            <strong>Analysis Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Mode 1: PDF File Drag and Drop */}
      {activeTab === 'pdf' ? (
        <div 
          className={`dropzone-card ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <div className="dropzone-empty-state">
              <div className="dropzone-icon-bubble">
                <IconUploadCloud size={36} className="dropzone-cloud-icon" />
              </div>
              <h3 className="dropzone-title">Drag & drop your research paper PDF here</h3>
              <p className="dropzone-desc">
                Supports ArXiv, IEEE, ACM, Nature, Science, and conference papers up to 30 MB.
              </p>
              <button 
                type="button" 
                className="btn-browse-file"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="file-preview-card">
              <div className="file-preview-icon">
                <IconFileText size={32} />
              </div>
              <div className="file-preview-info">
                <h4 className="file-preview-name">{selectedFile.name}</h4>
                <p className="file-preview-meta">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document Ready
                </p>
              </div>
              <button 
                type="button" 
                className="btn-remove-file" 
                onClick={handleClearFile} 
                title="Choose a different PDF"
              >
                Change File
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Paste Abstract / Text */
        <div className="paste-text-card">
          <div className="paste-header">
            <input
              type="text"
              placeholder="Paper Title (optional, e.g. Attention Is All You Need)"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              className="paper-title-input"
            />
            <div className="paste-actions-bar">
              <span className="word-count-badge">{wordCount} words</span>
              <button 
                type="button" 
                className="btn-load-sample-inline"
                onClick={handleLoadSampleText}
              >
                <IconZap size={14} />
                <span>Fill Vaswani Sample</span>
              </button>
            </div>
          </div>
          <textarea
            className="paste-textarea"
            rows={8}
            placeholder="Paste your research paper's abstract, introduction, methodology, or full text here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
        </div>
      )}

      {/* Primary Action Button */}
      <div className="action-row">
        <button
          type="button"
          className="btn-primary-analyze"
          disabled={isAnalyzing || (activeTab === 'pdf' && !selectedFile) || (activeTab === 'text' && pastedText.trim().length < 30)}
          onClick={handleAnalyze}
        >
          {isAnalyzing ? (
            <>
              <IconRefreshCw size={18} className="spinner-icon" />
              <span>Analyzing Paper & Verifying Quotes...</span>
            </>
          ) : (
            <>
              <IconSparkles size={18} />
              <span>Simplify Paper & Verify Evidence</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
