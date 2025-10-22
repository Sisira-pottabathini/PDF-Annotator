// src/components/Dashboard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, LogOut, User, Plus, Search, Trash2, Download, Loader } from 'lucide-react';
import { getUserPDFs, saveUserPDF, deleteUserPDF } from '../services/mockApi';

const Dashboard = ({ user, onLogout, onPDFSelect }) => {
  const [pdfs, setPdfs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Load user's PDFs when component mounts
  useEffect(() => {
    loadUserPDFs();
  }, [user]);

  const loadUserPDFs = async () => {
    try {
      setLoading(true);
      const userPDFs = await getUserPDFs(user.id);
      setPdfs(userPDFs);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
      alert('Failed to load your documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📤 Uploading file:', file.name, file.type, file.size);

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setUploading(true);
    try {
      const pdfData = {
        id: `pdf_${Date.now()}`,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        file: file, // Store the actual File object
        uploadDate: new Date().toLocaleDateString(),
        uploadTime: new Date().toISOString(),
      };

      console.log('✅ Created PDF data with file object:', pdfData);

      const savedPDF = await saveUserPDF(user.id, pdfData);
      setPdfs(prev => [savedPDF, ...prev]);
      
      event.target.value = '';
      alert('PDF uploaded successfully! Click "Annotate" to view it.');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handlePDFClick = (pdf) => {
    console.log('🖱️ Clicking PDF:', {
      id: pdf.id,
      name: pdf.name,
      hasFile: !!pdf.file,
      fileType: pdf.file?.type,
      fileSize: pdf.file?.size
    });

    if (!pdf.file) {
      alert('PDF file data is missing. Please re-upload the PDF.');
      return;
    }

    // Pass the PDF with the file object to PDFViewer
    onPDFSelect(pdf);
  };

  const handleDeletePDF = async (pdfId, event) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this PDF?')) {
      return;
    }

    try {
      await deleteUserPDF(user.id, pdfId);
      setPdfs(prev => prev.filter(pdf => pdf.id !== pdfId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete PDF');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    onLogout();
  };

  const filteredPDFs = pdfs.filter(pdf =>
    pdf.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Welcome, {user.name}!</h1>
          <p>Manage and annotate your PDF documents</p>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <User className="user-icon" />
            <span>{user.name}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Upload Section */}
      <section className="upload-section">
        <div 
          className={`upload-area ${uploading ? 'uploading' : ''}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader className="loading-spinner" size={32} />
              <h3>Uploading PDF...</h3>
              <p>Please wait</p>
            </>
          ) : (
            <>
              <Upload className="upload-icon" />
              <h3>Upload PDF Document</h3>
              <p>Click to browse or drag and drop</p>
              <p className="upload-hint">Supports .pdf files only</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </div>
      </section>

      {/* PDF List */}
      <section className="pdf-list-section">
        <div className="section-header">
          <h2>Your Documents</h2>
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="pdf-grid">
          {filteredPDFs.map(pdf => (
            <div key={pdf.id} className="pdf-card" onClick={() => handlePDFClick(pdf)}>
              <div className="pdf-icon">
                <FileText />
              </div>
              <div className="pdf-info">
                <h4>{pdf.name}</h4>
                <div className="pdf-meta">
                  <span>Uploaded: {pdf.uploadDate}</span>
                  <span>Size: {pdf.size}</span>
                  <span className={`file-status ${pdf.file ? 'status-ok' : 'status-missing'}`}>
                    {pdf.file ? '✅ File Ready' : '❌ File Missing'}
                  </span>
                </div>
              </div>
              <div className="pdf-actions">
                <button 
                  className="annotate-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePDFClick(pdf);
                  }}
                >
                  <Plus size={14} />
                  Annotate
                </button>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeletePDF(pdf.id, e)}
                  title="Delete PDF"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {filteredPDFs.length === 0 && pdfs.length > 0 && (
            <div className="no-results">
              <Search size={48} />
              <h3>No documents found</h3>
              <p>Try adjusting your search terms</p>
            </div>
          )}

          {pdfs.length === 0 && !loading && (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>No documents yet</h3>
              <p>Upload your first PDF to start annotating</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <Loader className="loading-spinner" size={32} />
              <p>Loading your documents...</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;